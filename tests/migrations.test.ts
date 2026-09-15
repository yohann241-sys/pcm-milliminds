import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const database = new PGlite();

beforeAll(async () => {
  const files = [
    "netlify/database/migrations/202609140001_create_schema.sql",
    "netlify/database/migrations/202609140002_seed_questionnaire.sql",
    "netlify/database/migrations/202609140003_pcm_v12.sql",
    "netlify/database/migrations/202609150001_role_scoping_and_ownership.sql",
  ];
  for (const file of files) {
    const sql = readFileSync(resolve(process.cwd(), file), "utf8")
      .replace("CREATE EXTENSION IF NOT EXISTS pgcrypto;", "");
    await database.exec(sql);
  }
});

afterAll(async () => database.close());

describe("migrations Netlify Database", () => {
  it("créent le schéma et la session initiale", async () => {
    const tables = await database.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
    );
    expect(tables.rows.map((row) => row.table_name)).toEqual(expect.arrayContaining([
      "participants", "assessments", "assessment_responses", "seminar_sessions", "questionnaire_items",
    ]));
    const sessions = await database.query<{ active: boolean }>("SELECT active FROM seminar_sessions");
    expect(sessions.rows).toHaveLength(1);
    expect(sessions.rows[0].active).toBe(true);
    const ownerColumn = await database.query<{ column_name: string }>("SELECT column_name FROM information_schema.columns WHERE table_name='seminar_sessions' AND column_name='owner_email'");
    expect(ownerColumn.rows).toHaveLength(1);
  });

  it("conservent six dimensions et activent la version PCM 1.2", async () => {
    const dimensions = await database.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM dimensions");
    const questions = await database.query<{ count: number }>("SELECT COUNT(*)::int AS count FROM questionnaire_items q JOIN assessment_versions v ON v.id=q.assessment_version_id WHERE v.version=\'1.2\'");
    const active = await database.query<{ version: string }>("SELECT version FROM assessment_versions WHERE active=TRUE");
    expect(dimensions.rows[0].count).toBe(6);
    expect(questions.rows[0].count).toBe(72);
    expect(active.rows).toHaveLength(1);
    expect(active.rows[0].version).toBe("1.2");
  });
});
