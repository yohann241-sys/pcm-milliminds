import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  resolve(process.cwd(), "netlify/database/migrations/202609140002_seed_questionnaire.sql"),
  "utf8",
);
const rows = sql.split("\n").filter((line) => /^\s*\('(ANA|CON|REL|REF|CRE|ACT)'/.test(line));

describe("questionnaire seed", () => {
  it("contient 72 affirmations numérotées sans doublon", () => {
    expect(rows).toHaveLength(72);
    const order = rows.map((line) => Number(line.match(/,(\d+)\),?\s*$/)?.[1]));
    expect(new Set(order).size).toBe(72);
    expect(Math.min(...order)).toBe(1);
    expect(Math.max(...order)).toBe(72);
  });

  it("équilibre les six dimensions et les deux lectures", () => {
    for (const code of ["ANA", "CON", "REL", "REF", "CRE", "ACT"]) {
      expect(rows.filter((line) => line.includes(`('${code}'`))).toHaveLength(12);
    }
    expect(rows.filter((line) => line.includes("'structure'")).length).toBe(54);
    expect(rows.filter((line) => line.includes("'dynamique'")).length).toBe(18);
  });

  it("duplique chaque paire de cohérence exactement deux fois", () => {
    const pairKeys = [...sql.matchAll(/'(ANA_PLAN|ANA_PRECISION|REL_CLIMAT|ACT_DECISION|ACT_ANALYSE|CON_VALEURS|CRE_TON|REF_REPONSE|REF_BRUIT)'/g)].map((match) => match[1]);
    const counts = pairKeys.reduce<Record<string, number>>((acc, key) => ({ ...acc, [key]: (acc[key] ?? 0) + 1 }), {});
    Object.values(counts).forEach((count) => expect(count).toBe(2));
  });
});
