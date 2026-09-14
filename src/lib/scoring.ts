import {
  DIMENSION_BY_CODE,
  DIMENSION_CODES,
  type AnswerPayload,
  type DimensionCode,
  type DimensionScore,
  type Question,
  type QualityIndicators,
  type ScoreResult,
} from "./model";

const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 10) / 10;

function standardDeviation(values: number[]) {
  if (values.length < 2) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

function scoreFor(items: Question[], answerMap: Map<string, number>) {
  const scored = items
    .map((item) => {
      const raw = answerMap.get(item.id);
      if (raw === undefined) return null;
      return item.reverseScored ? 6 - raw : raw;
    })
    .filter((value): value is number => value !== null);

  if (!scored.length) return 0;
  const average = scored.reduce((sum, value) => sum + value, 0) / scored.length;
  return round(clamp((average - 1) * 25));
}

function determineLeaders(scores: DimensionScore[], key: "structure" | "dynamique") {
  const ordered = [...scores].sort((a, b) => b[key] - a[key]);
  const best = ordered[0]?.[key] ?? 0;
  return ordered.filter((item) => best - item[key] <= 4).map((item) => item.code);
}

function qualityIndicators(
  questions: Question[],
  answerMap: Map<string, number>,
  durationSeconds: number,
): QualityIndicators {
  const rawValues = [...answerMap.values()];
  const completeness = questions.length ? clamp((rawValues.length / questions.length) * 100) : 0;

  const paired = new Map<string, Question[]>();
  questions.forEach((question) => {
    if (!question.pairKey) return;
    paired.set(question.pairKey, [...(paired.get(question.pairKey) ?? []), question]);
  });
  const pairDifferences: number[] = [];
  paired.forEach((items) => {
    if (items.length !== 2) return;
    const first = answerMap.get(items[0].id);
    const second = answerMap.get(items[1].id);
    if (first === undefined || second === undefined) return;
    const scoredFirst = items[0].reverseScored ? 6 - first : first;
    const scoredSecond = items[1].reverseScored ? 6 - second : second;
    pairDifferences.push(Math.abs(scoredFirst - scoredSecond));
  });
  const meanDifference = pairDifferences.length
    ? pairDifferences.reduce((sum, value) => sum + value, 0) / pairDifferences.length
    : 1;
  const consistency = clamp(100 - meanDifference * 25);

  const spread = standardDeviation(rawValues);
  const neutralRate = rawValues.length
    ? (rawValues.filter((value) => value === 3).length / rawValues.length) * 100
    : 100;
  const variability = clamp((spread / 1.15) * 100 - Math.max(0, neutralRate - 45) * 0.8);

  let pace = 100;
  if (durationSeconds > 0 && durationSeconds < 240) pace = 30;
  else if (durationSeconds > 0 && durationSeconds < 360) pace = 55;
  else if (durationSeconds > 0 && durationSeconds < 480) pace = 75;

  const score = round(
    clamp(completeness * 0.2 + consistency * 0.4 + variability * 0.25 + pace * 0.15),
  );
  const flags: string[] = [];
  if (completeness < 100) flags.push("Réponses incomplètes");
  if (neutralRate > 55) flags.push("Usage fréquent de la réponse neutre");
  if (spread < 0.55) flags.push("Réponses peu différenciées");
  if (durationSeconds > 0 && durationSeconds < 360) flags.push("Temps de passation très court");
  if (consistency < 60) flags.push("Écarts à explorer en entretien");

  const label = score >= 80 ? "Élevée" : score >= 65 ? "Satisfaisante" : score >= 50 ? "À consolider" : "Fragile";

  return {
    score,
    label,
    completeness: round(completeness),
    consistency: round(consistency),
    variability: round(variability),
    pace: round(pace),
    neutralRate: round(neutralRate),
    durationSeconds,
    flags,
  };
}

export function calculateScores(
  questions: Question[],
  answers: AnswerPayload[],
  durationSeconds: number,
): ScoreResult {
  const answerMap = new Map(
    answers
      .filter((answer) => Number.isInteger(answer.value) && answer.value >= 1 && answer.value <= 5)
      .map((answer) => [answer.questionId, answer.value]),
  );

  const dimensions = DIMENSION_CODES.map((code) => {
    const dimensionItems = questions.filter((question) => question.dimension === code);
    return {
      code,
      structure: scoreFor(dimensionItems.filter((question) => question.kind === "structure"), answerMap),
      dynamique: scoreFor(dimensionItems.filter((question) => question.kind === "dynamique"), answerMap),
      rank: 0,
    } satisfies DimensionScore;
  })
    .sort((a, b) => b.structure - a.structure)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  return {
    dimensions,
    leadingStructure: determineLeaders(dimensions, "structure"),
    leadingDynamics: determineLeaders(dimensions, "dynamique"),
    quality: qualityIndicators(questions, answerMap, durationSeconds),
  };
}

export function buildTrainerSynthesis(result: ScoreResult) {
  const structure = result.leadingStructure.map((code) => DIMENSION_BY_CODE[code].shortName).join(" et ");
  const dynamics = result.leadingDynamics.map((code) => DIMENSION_BY_CODE[code].shortName).join(" et ");
  return `La Structure de Personnalité issue de cet inventaire fait ressortir ${structure} comme Base proposée. Les réponses relatives aux Besoins Psychologiques actuels font ressortir ${dynamics} comme Phase actuelle proposée. Le formateur valide la Base, la Phase et leur interprétation au cours de la restitution.`;
}
