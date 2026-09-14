import { describe, expect, it } from "vitest";
import { calculateScores } from "../src/lib/scoring";
import type { Question } from "../src/lib/model";

const questions: Question[] = [
  { id: "a1", orderIndex: 1, wording: "A1", dimension: "ANA", kind: "structure", reverseScored: false, pairKey: "a" },
  { id: "a2", orderIndex: 2, wording: "A2", dimension: "ANA", kind: "structure", reverseScored: true, pairKey: "a" },
  { id: "a3", orderIndex: 3, wording: "A3", dimension: "ANA", kind: "dynamique", reverseScored: false },
  { id: "r1", orderIndex: 4, wording: "R1", dimension: "REL", kind: "structure", reverseScored: false },
  { id: "r2", orderIndex: 5, wording: "R2", dimension: "REL", kind: "dynamique", reverseScored: false },
];

describe("calculateScores", () => {
  it("applique la cotation inversée et classe les dimensions", () => {
    const result = calculateScores(
      questions,
      [
        { questionId: "a1", value: 5 },
        { questionId: "a2", value: 1 },
        { questionId: "a3", value: 4 },
        { questionId: "r1", value: 2 },
        { questionId: "r2", value: 3 },
      ],
      900,
    );
    expect(result.dimensions[0].code).toBe("ANA");
    expect(result.dimensions[0].structure).toBe(100);
    expect(result.leadingStructure).toContain("ANA");
    expect(result.quality.completeness).toBe(100);
  });

  it("signale une passation uniforme et trop rapide", () => {
    const result = calculateScores(
      questions,
      questions.map((question) => ({ questionId: question.id, value: 3 })),
      120,
    );
    expect(result.quality.flags).toContain("Temps de passation très court");
    expect(result.quality.flags).toContain("Réponses peu différenciées");
    expect(result.quality.score).toBeLessThan(70);
  });
});
