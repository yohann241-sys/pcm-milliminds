import { getDatabase } from "@netlify/database";
import type { Config } from "@netlify/functions";
import { buildTrainerSynthesis, calculateScores } from "../../src/lib/scoring";
import type {
  AnswerPayload,
  AssessmentStatus,
  DimensionCode,
  DimensionDefinition,
  Question,
  ScoreResult,
} from "../../src/lib/model";
import {
  clearSessionCookie,
  createAdminSession,
  createParticipantToken,
  hashToken,
  readAdminSession,
  safeEqual,
  sessionCookie,
} from "./auth";

const db = getDatabase();

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });

const clean = (value: unknown, max = 120) =>
  String(value ?? "")
    .normalize("NFC")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const parseBody = async (request: Request) => {
  try {
    return (await request.json()) as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "Le contenu envoyé n’est pas valide.");
  }
};

const routePath = (request: Request) => {
  const pathname = new URL(request.url).pathname;
  return pathname
    .replace(/^\/\.netlify\/functions\/api/, "")
    .replace(/^\/api/, "") || "/";
};

function requireAdmin(request: Request) {
  const session = readAdminSession(request);
  if (!session) throw new HttpError(401, "Session administrateur requise.");
  return session;
}

function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
}

function assertMutationOrigin(request: Request) {
  const configured = process.env.APP_ORIGIN;
  const origin = request.headers.get("origin");
  if (configured && origin && origin !== configured && process.env.CONTEXT !== "dev") {
    throw new HttpError(403, "Origine de requête refusée.");
  }
}

function mapQuestion(row: Record<string, unknown>): Question {
  return {
    id: String(row.id),
    orderIndex: Number(row.order_index),
    wording: String(row.wording),
    dimension: String(row.dimension_code) as DimensionCode,
    kind: String(row.item_kind) as "structure" | "dynamique",
    reverseScored: Boolean(row.reverse_scored),
    pairKey: row.pair_key ? String(row.pair_key) : null,
  };
}

function mapDimension(row: Record<string, unknown>): DimensionDefinition {
  return {
    code: String(row.code) as DimensionCode,
    name: String(row.name),
    shortName: String(row.short_name),
    color: String(row.color),
    description: String(row.description),
    perception: String(row.perception),
    channel: String(row.channel),
    strengths: (row.strengths ?? []) as string[],
    watchouts: (row.watchouts ?? []) as string[],
    motivators: (row.motivators ?? []) as string[],
    connectionTips: (row.connection_tips ?? []) as string[],
  };
}

async function activePublicSession() {
  const rows = await db.sql<Record<string, unknown>>`
    SELECT s.id, s.name, s.organization, av.id AS version_id, av.version,
           av.estimated_minutes, av.disclaimer,
           COUNT(q.id)::int AS item_count
    FROM seminar_sessions s
    JOIN assessment_versions av ON av.id = s.assessment_version_id
    LEFT JOIN questionnaire_items q ON q.assessment_version_id = av.id AND q.active = TRUE
    WHERE s.active = TRUE AND av.active = TRUE
    GROUP BY s.id, s.name, s.organization, av.id, av.version, av.estimated_minutes, av.disclaimer
    ORDER BY s.created_at DESC
    LIMIT 1
  `;
  if (!rows[0]) throw new HttpError(503, "Aucune session de passation n’est actuellement ouverte.");
  return rows[0];
}

async function questionsForVersion(versionId: string) {
  const rows = await db.sql<Record<string, unknown>>`
    SELECT id, order_index, wording, dimension_code, item_kind, reverse_scored, pair_key
    FROM questionnaire_items
    WHERE assessment_version_id = ${versionId} AND active = TRUE
    ORDER BY order_index
  `;
  return rows.map(mapQuestion);
}

async function assessmentForParticipant(assessmentId: string, token: string) {
  if (!token) throw new HttpError(401, "Accès participant requis.");
  const rows = await db.sql<Record<string, unknown>>`
    SELECT id, status, access_token_hash, assessment_version_id, started_at
    FROM assessments WHERE id = ${assessmentId}
  `;
  const assessment = rows[0];
  if (!assessment || !safeEqual(String(assessment.access_token_hash), hashToken(token))) {
    throw new HttpError(401, "Accès participant invalide.");
  }
  return assessment;
}

async function saveAnswers(
  assessmentId: string,
  versionId: string,
  answers: AnswerPayload[],
) {
  if (!answers.length) return;
  const unique = [...new Map(answers.map((answer) => [answer.questionId, answer])).values()];
  if (unique.some((answer) => !/^[0-9a-f-]{36}$/i.test(answer.questionId) || !Number.isInteger(answer.value) || answer.value < 1 || answer.value > 5)) {
    throw new HttpError(400, "Une ou plusieurs réponses sont invalides.");
  }
  const payload = JSON.stringify(unique.map((answer) => ({ question_id: answer.questionId, value: answer.value })));
  await db.sql.unsafe(
    `INSERT INTO assessment_responses (assessment_id, question_id, value, saved_at)
     SELECT $1::uuid, x.question_id::uuid, x.value::smallint, NOW()
     FROM jsonb_to_recordset($2::jsonb) AS x(question_id text, value int)
     JOIN questionnaire_items q ON q.id = x.question_id::uuid
       AND q.assessment_version_id = $3::uuid AND q.active = TRUE
     ON CONFLICT (assessment_id, question_id)
     DO UPDATE SET value = EXCLUDED.value, saved_at = NOW()`,
    [assessmentId, payload, versionId],
  );
  await db.sql`UPDATE assessments SET updated_at = NOW() WHERE id = ${assessmentId}`;
}

async function audit(actor: string, action: string, entityType: string, entityId?: string, metadata: unknown = {}) {
  await db.sql`
    INSERT INTO audit_logs (actor, action, entity_type, entity_id, metadata)
    VALUES (${actor}, ${action}, ${entityType}, ${entityId ?? null}, ${JSON.stringify(metadata)}::jsonb)
  `;
}

async function publicConfig() {
  const session = await activePublicSession();
  return json({
    session: {
      id: String(session.id),
      name: String(session.name),
      organization: String(session.organization),
      assessmentVersion: String(session.version),
      itemCount: Number(session.item_count),
      estimatedMinutes: Number(session.estimated_minutes),
    },
    disclaimer: String(session.disclaimer),
  });
}

async function createParticipant(request: Request) {
  assertMutationOrigin(request);
  const body = await parseBody(request);
  const firstName = clean(body.firstName, 80);
  const lastName = clean(body.lastName, 80);
  const organization = clean(body.organization, 120);
  if (firstName.length < 2 || lastName.length < 2) {
    throw new HttpError(400, "Le nom et le prénom sont obligatoires.");
  }
  if (body.consent !== true) throw new HttpError(400, "Le consentement est nécessaire pour commencer.");
  const session = await activePublicSession();
  const token = createParticipantToken();
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    const participantResult = await client.query(
      `INSERT INTO participants (first_name, last_name, organization, consent_at)
       VALUES ($1, $2, NULLIF($3, ''), NOW()) RETURNING id`,
      [firstName, lastName.toUpperCase(), organization],
    );
    const assessmentResult = await client.query(
      `INSERT INTO assessments (
         participant_id, seminar_session_id, assessment_version_id, access_token_hash
       ) VALUES ($1, $2, $3, $4)
       RETURNING id, started_at`,
      [participantResult.rows[0].id, session.id, session.version_id, hashToken(token)],
    );
    await client.query("COMMIT");
    const questions = await questionsForVersion(String(session.version_id));
    await audit(`${firstName} ${lastName.toUpperCase()}`, "assessment_started", "assessment", assessmentResult.rows[0].id);
    return json(
      {
        participantId: participantResult.rows[0].id,
        assessmentId: assessmentResult.rows[0].id,
        accessToken: token,
        firstName,
        lastName: lastName.toUpperCase(),
        sessionName: String(session.name),
        questions,
        startedAt: assessmentResult.rows[0].started_at,
      },
      201,
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function saveProgress(request: Request, assessmentId: string) {
  assertMutationOrigin(request);
  const assessment = await assessmentForParticipant(assessmentId, bearerToken(request));
  if (assessment.status !== "draft") throw new HttpError(409, "Cette passation est déjà finalisée.");
  const body = await parseBody(request);
  const answers = Array.isArray(body.answers) ? (body.answers as AnswerPayload[]) : [];
  await saveAnswers(assessmentId, String(assessment.assessment_version_id), answers);
  return json({ saved: true, count: answers.length });
}

async function submitAssessment(request: Request, assessmentId: string) {
  assertMutationOrigin(request);
  const token = bearerToken(request);
  const assessment = await assessmentForParticipant(assessmentId, token);
  if (assessment.status !== "draft") throw new HttpError(409, "Cette passation est déjà finalisée.");
  const body = await parseBody(request);
  const answers = Array.isArray(body.answers) ? (body.answers as AnswerPayload[]) : [];
  await saveAnswers(assessmentId, String(assessment.assessment_version_id), answers);

  const [questions, responseRows] = await Promise.all([
    questionsForVersion(String(assessment.assessment_version_id)),
    db.sql<Record<string, unknown>>`
      SELECT question_id, value FROM assessment_responses WHERE assessment_id = ${assessmentId}
    `,
  ]);
  if (responseRows.length !== questions.length) {
    throw new HttpError(400, `La passation est incomplète (${responseRows.length}/${questions.length}).`);
  }
  const persisted = responseRows.map((row) => ({ questionId: String(row.question_id), value: Number(row.value) }));
  const durationSeconds = Math.max(
    1,
    Math.round((Date.now() - new Date(String(assessment.started_at)).getTime()) / 1000),
  );
  const scores = calculateScores(questions, persisted, durationSeconds);
  await db.sql`
    UPDATE assessments
    SET status = 'submitted', submitted_at = NOW(), duration_seconds = ${durationSeconds},
        score_json = ${JSON.stringify(scores)}::jsonb, quality_score = ${scores.quality.score}, updated_at = NOW()
    WHERE id = ${assessmentId} AND status = 'draft'
  `;
  await db.sql`
    INSERT INTO interpretations (assessment_id, synthesis)
    VALUES (${assessmentId}, ${buildTrainerSynthesis(scores)})
    ON CONFLICT (assessment_id) DO NOTHING
  `;
  await audit("participant", "assessment_submitted", "assessment", assessmentId, {
    qualityScore: scores.quality.score,
  });
  return json({
    submitted: true,
    receipt: assessmentId.slice(0, 8).toUpperCase(),
    message: "Vos réponses ont été enregistrées. Le formateur préparera votre restitution.",
  });
}

async function adminLogin(request: Request) {
  assertMutationOrigin(request);
  const body = await parseBody(request);
  const email = clean(body.email, 160).toLowerCase();
  const password = String(body.password ?? "");
  const expectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedEmail || !expectedPassword || !process.env.SESSION_SECRET) {
    throw new HttpError(503, "L’accès administrateur n’est pas encore configuré.");
  }
  if (!safeEqual(email, expectedEmail) || !safeEqual(password, expectedPassword)) {
    await audit(email || "inconnu", "admin_login_failed", "authentication");
    throw new HttpError(401, "Identifiants incorrects.");
  }
  const token = createAdminSession(email);
  await audit(email, "admin_login", "authentication");
  return json({ authenticated: true, email }, 200, { "set-cookie": sessionCookie(token) });
}

async function dashboard(request: Request) {
  requireAdmin(request);
  const [summaryRows, recentRows, dimensionRows, sessionRows] = await Promise.all([
    db.sql<Record<string, unknown>>`
      SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'submitted')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'reviewed')::int AS reviewed,
        COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered,
        ROUND(AVG(quality_score), 1) AS avg_quality
      FROM assessments
    `,
    db.sql<Record<string, unknown>>`
      SELECT a.id, p.first_name, p.last_name, p.organization, s.name AS session_name,
             a.status, a.submitted_at, a.quality_score, a.score_json
      FROM assessments a
      JOIN participants p ON p.id = a.participant_id
      JOIN seminar_sessions s ON s.id = a.seminar_session_id
      ORDER BY COALESCE(a.submitted_at, a.created_at) DESC
      LIMIT 8
    `,
    db.sql<Record<string, unknown>>`SELECT * FROM dimensions ORDER BY CASE code WHEN 'ANA' THEN 1 WHEN 'CON' THEN 2 WHEN 'REL' THEN 3 WHEN 'REF' THEN 4 WHEN 'CRE' THEN 5 WHEN 'ACT' THEN 6 END`,
    db.sql<Record<string, unknown>>`
      SELECT s.id, s.name, s.organization, s.active, s.created_at, av.version,
             COUNT(a.id)::int AS participant_count
      FROM seminar_sessions s
      JOIN assessment_versions av ON av.id = s.assessment_version_id
      LEFT JOIN assessments a ON a.seminar_session_id = s.id
      GROUP BY s.id, s.name, s.organization, s.active, s.created_at, av.version
      ORDER BY s.created_at DESC
    `,
  ]);
  const summary = summaryRows[0] ?? {};
  return json({
    summary: {
      total: Number(summary.total ?? 0),
      pending: Number(summary.pending ?? 0),
      reviewed: Number(summary.reviewed ?? 0),
      delivered: Number(summary.delivered ?? 0),
      avgQuality: Number(summary.avg_quality ?? 0),
    },
    recent: recentRows.map(mapAssessmentListRow),
    dimensions: dimensionRows.map(mapDimension),
    sessions: sessionRows.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      organization: String(row.organization),
      active: Boolean(row.active),
      version: String(row.version),
      participantCount: Number(row.participant_count),
      createdAt: String(row.created_at),
    })),
  });
}

function scoreObject(value: unknown): ScoreResult | null {
  if (!value) return null;
  if (typeof value === "string") {
    try { return JSON.parse(value) as ScoreResult; } catch { return null; }
  }
  return value as ScoreResult;
}

function mapAssessmentListRow(row: Record<string, unknown>) {
  const score = scoreObject(row.score_json);
  return {
    id: String(row.id),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    organization: row.organization ? String(row.organization) : null,
    sessionName: String(row.session_name),
    status: String(row.status) as AssessmentStatus,
    submittedAt: row.submitted_at ? String(row.submitted_at) : null,
    qualityScore: row.quality_score === null ? null : Number(row.quality_score),
    leadingStructure: score?.leadingStructure ?? [],
    leadingDynamics: score?.leadingDynamics ?? [],
  };
}

async function listAssessments(request: Request) {
  requireAdmin(request);
  const url = new URL(request.url);
  const search = clean(url.searchParams.get("search"), 80);
  const status = clean(url.searchParams.get("status"), 20);
  const like = `%${search}%`;
  const rows = await db.sql<Record<string, unknown>>`
    SELECT a.id, p.first_name, p.last_name, p.organization, s.name AS session_name,
           a.status, a.submitted_at, a.quality_score, a.score_json
    FROM assessments a
    JOIN participants p ON p.id = a.participant_id
    JOIN seminar_sessions s ON s.id = a.seminar_session_id
    WHERE (${search} = '' OR p.first_name ILIKE ${like} OR p.last_name ILIKE ${like}
           OR COALESCE(p.organization, '') ILIKE ${like})
      AND (${status} = '' OR a.status = ${status})
    ORDER BY COALESCE(a.submitted_at, a.created_at) DESC
    LIMIT 500
  `;
  return json({ assessments: rows.map(mapAssessmentListRow) });
}

async function assessmentDetail(request: Request, assessmentId: string) {
  requireAdmin(request);
  const [rows, answerRows, dimensionRows] = await Promise.all([
    db.sql<Record<string, unknown>>`
      SELECT a.id, a.status, a.created_at, a.submitted_at, a.quality_score, a.score_json,
             p.first_name, p.last_name, p.organization, s.name AS session_name,
             COALESCE(i.synthesis, '') AS synthesis,
             COALESCE(i.observations, '') AS observations,
             COALESCE(i.action_plan, '') AS action_plan,
             COALESCE(i.trainer_name, '') AS trainer_name,
             i.restitution_date
      FROM assessments a
      JOIN participants p ON p.id = a.participant_id
      JOIN seminar_sessions s ON s.id = a.seminar_session_id
      LEFT JOIN interpretations i ON i.assessment_id = a.id
      WHERE a.id = ${assessmentId}
    `,
    db.sql<Record<string, unknown>>`
      SELECT question_id, value FROM assessment_responses WHERE assessment_id = ${assessmentId}
    `,
    db.sql<Record<string, unknown>>`SELECT * FROM dimensions ORDER BY CASE code WHEN 'ANA' THEN 1 WHEN 'CON' THEN 2 WHEN 'REL' THEN 3 WHEN 'REF' THEN 4 WHEN 'CRE' THEN 5 WHEN 'ACT' THEN 6 END`,
  ]);
  const row = rows[0];
  if (!row) throw new HttpError(404, "Résultat introuvable.");
  const base = mapAssessmentListRow(row);
  return json({
    assessment: {
      ...base,
      createdAt: String(row.created_at),
      scores: scoreObject(row.score_json),
      answers: answerRows.map((answer) => ({ questionId: String(answer.question_id), value: Number(answer.value) })),
      dimensions: dimensionRows.map(mapDimension),
      interpretation: {
        synthesis: String(row.synthesis),
        observations: String(row.observations),
        actionPlan: String(row.action_plan),
        trainerName: String(row.trainer_name),
        restitutionDate: row.restitution_date ? String(row.restitution_date) : null,
      },
    },
  });
}

async function updateInterpretation(request: Request, assessmentId: string) {
  assertMutationOrigin(request);
  const admin = requireAdmin(request);
  const body = await parseBody(request);
  const synthesis = clean(body.synthesis, 5000);
  const observations = clean(body.observations, 5000);
  const actionPlan = clean(body.actionPlan, 5000);
  const trainerName = clean(body.trainerName, 160);
  const restitutionDate = clean(body.restitutionDate, 10) || null;
  await db.sql`
    INSERT INTO interpretations (
      assessment_id, synthesis, observations, action_plan, trainer_name, restitution_date, updated_at
    ) VALUES (
      ${assessmentId}, ${synthesis}, ${observations}, ${actionPlan}, ${trainerName}, ${restitutionDate}, NOW()
    )
    ON CONFLICT (assessment_id) DO UPDATE SET
      synthesis = EXCLUDED.synthesis,
      observations = EXCLUDED.observations,
      action_plan = EXCLUDED.action_plan,
      trainer_name = EXCLUDED.trainer_name,
      restitution_date = EXCLUDED.restitution_date,
      updated_at = NOW()
  `;
  await db.sql`
    UPDATE assessments SET status = CASE WHEN status = 'submitted' THEN 'reviewed' ELSE status END,
      updated_at = NOW() WHERE id = ${assessmentId}
  `;
  await audit(admin.email, "interpretation_updated", "assessment", assessmentId);
  return json({ saved: true });
}

async function updateStatus(request: Request, assessmentId: string) {
  assertMutationOrigin(request);
  const admin = requireAdmin(request);
  const body = await parseBody(request);
  const status = clean(body.status, 20) as AssessmentStatus;
  if (!["submitted", "reviewed", "delivered"].includes(status)) throw new HttpError(400, "Statut invalide.");
  await db.sql`UPDATE assessments SET status = ${status}, updated_at = NOW() WHERE id = ${assessmentId}`;
  await audit(admin.email, "assessment_status_changed", "assessment", assessmentId, { status });
  return json({ saved: true, status });
}

async function createSession(request: Request) {
  assertMutationOrigin(request);
  const admin = requireAdmin(request);
  const body = await parseBody(request);
  const name = clean(body.name, 160);
  const organization = clean(body.organization, 160) || "Milliminds";
  if (name.length < 3) throw new HttpError(400, "Le nom de la session est obligatoire.");
  const rows = await db.sql<Record<string, unknown>>`
    INSERT INTO seminar_sessions (name, organization, assessment_version_id)
    SELECT ${name}, ${organization}, id FROM assessment_versions WHERE active = TRUE
    ORDER BY created_at DESC LIMIT 1
    RETURNING id
  `;
  if (!rows[0]) throw new HttpError(503, "Aucune version active du questionnaire.");
  await audit(admin.email, "session_created", "seminar_session", String(rows[0].id), { name });
  return json({ created: true, id: String(rows[0].id) }, 201);
}

async function activateSession(request: Request, sessionId: string) {
  assertMutationOrigin(request);
  const admin = requireAdmin(request);
  const client = await db.pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE seminar_sessions SET active = FALSE WHERE active = TRUE");
    const result = await client.query("UPDATE seminar_sessions SET active = TRUE WHERE id = $1 RETURNING id", [sessionId]);
    if (!result.rows[0]) throw new HttpError(404, "Session introuvable.");
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  await audit(admin.email, "session_activated", "seminar_session", sessionId);
  return json({ activated: true });
}

const csvCell = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;

async function exportCsv(request: Request) {
  requireAdmin(request);
  const rows = await db.sql<Record<string, unknown>>`
    SELECT a.id, p.last_name, p.first_name, p.organization, s.name AS session_name,
           a.status, a.submitted_at, a.quality_score, a.score_json
    FROM assessments a
    JOIN participants p ON p.id = a.participant_id
    JOIN seminar_sessions s ON s.id = a.seminar_session_id
    ORDER BY COALESCE(a.submitted_at, a.created_at) DESC
  `;
  const headers = [
    "Référence", "Nom", "Prénom", "Organisation", "Session", "Statut", "Soumis le",
    "Qualité", "Analyse", "Conviction", "Relation", "Réflexion", "Créativité", "Action",
    "Dynamique dominante",
  ];
  const lines = rows.map((row) => {
    const result = scoreObject(row.score_json);
    const byCode = Object.fromEntries((result?.dimensions ?? []).map((item) => [item.code, item.structure]));
    return [
      row.id, row.last_name, row.first_name, row.organization, row.session_name, row.status,
      row.submitted_at, row.quality_score, byCode.ANA, byCode.CON, byCode.REL,
      byCode.REF, byCode.CRE, byCode.ACT, result?.leadingDynamics.join(" / ") ?? "",
    ].map(csvCell).join(";");
  });
  return new Response(`\uFEFF${headers.map(csvCell).join(";")}\n${lines.join("\n")}`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="resultats-reperes-communication-${new Date().toISOString().slice(0, 10)}.csv"`,
      "cache-control": "no-store",
    },
  });
}

export default async (request: Request) => {
  try {
    const path = routePath(request);
    const method = request.method.toUpperCase();

    if (method === "GET" && path === "/health") return json({ ok: true, service: "reperes-communication" });
    if (method === "GET" && path === "/public/config") return publicConfig();
    if (method === "POST" && path === "/public/participants") return createParticipant(request);

    const progressMatch = path.match(/^\/public\/assessments\/([0-9a-f-]{36})\/progress$/i);
    if (method === "PUT" && progressMatch) return saveProgress(request, progressMatch[1]);
    const submitMatch = path.match(/^\/public\/assessments\/([0-9a-f-]{36})\/submit$/i);
    if (method === "POST" && submitMatch) return submitAssessment(request, submitMatch[1]);

    if (method === "POST" && path === "/admin/login") return adminLogin(request);
    if (method === "POST" && path === "/admin/logout") {
      return json({ authenticated: false }, 200, { "set-cookie": clearSessionCookie() });
    }
    if (method === "GET" && path === "/admin/me") {
      const admin = requireAdmin(request);
      return json({ authenticated: true, ...admin });
    }
    if (method === "GET" && path === "/admin/dashboard") return dashboard(request);
    if (method === "GET" && path === "/admin/assessments") return listAssessments(request);
    if (method === "GET" && path === "/admin/export") return exportCsv(request);
    if (method === "POST" && path === "/admin/sessions") return createSession(request);

    const activateMatch = path.match(/^\/admin\/sessions\/([0-9a-f-]{36})\/activate$/i);
    if (method === "PUT" && activateMatch) return activateSession(request, activateMatch[1]);
    const detailMatch = path.match(/^\/admin\/assessments\/([0-9a-f-]{36})$/i);
    if (method === "GET" && detailMatch) return assessmentDetail(request, detailMatch[1]);
    const interpretationMatch = path.match(/^\/admin\/assessments\/([0-9a-f-]{36})\/interpretation$/i);
    if (method === "PUT" && interpretationMatch) return updateInterpretation(request, interpretationMatch[1]);
    const statusMatch = path.match(/^\/admin\/assessments\/([0-9a-f-]{36})\/status$/i);
    if (method === "PUT" && statusMatch) return updateStatus(request, statusMatch[1]);

    throw new HttpError(404, "Ressource introuvable.");
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error(error);
    return json({ error: "Une erreur interne est survenue. Réessayez dans quelques instants." }, 500);
  }
};

export const config: Config = {
  path: "/api/*",
  rateLimit: {
    windowLimit: 120,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  },
};
