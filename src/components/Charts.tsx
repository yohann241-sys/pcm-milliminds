import type { DimensionDefinition, DimensionScore } from "../lib/model";

export function ScoreBars({
  scores,
  dimensions,
  field,
}: {
  scores: DimensionScore[];
  dimensions: DimensionDefinition[];
  field: "structure" | "dynamique";
}) {
  const definitions = Object.fromEntries(dimensions.map((item) => [item.code, item]));
  return (
    <div className="score-bars">
      {[...scores].sort((a, b) => b[field] - a[field]).map((score) => {
        const dimension = definitions[score.code];
        return (
          <div className="score-row" key={`${field}-${score.code}`}>
            <div className="score-row__meta"><span>{dimension?.shortName ?? score.code}</span><strong>{Math.round(score[field])}</strong></div>
            <div className="score-row__track"><span style={{ width: `${score[field]}%`, background: dimension?.color }} /></div>
          </div>
        );
      })}
    </div>
  );
}

export function RadarChart({
  scores,
  dimensions,
  field = "structure",
}: {
  scores: DimensionScore[];
  dimensions: DimensionDefinition[];
  field?: "structure" | "dynamique";
}) {
  const size = 320;
  const center = 160;
  const radius = 100;
  const count = 6;
  const byCode = Object.fromEntries(scores.map((score) => [score.code, score]));
  const point = (index: number, value: number) => {
    const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
    const scaled = (radius * value) / 100;
    return [center + Math.cos(angle) * scaled, center + Math.sin(angle) * scaled];
  };
  const grid = [20, 40, 60, 80, 100].map((level) =>
    dimensions.map((_, index) => point(index, level).join(",")).join(" "),
  );
  const polygon = dimensions
    .map((dimension, index) => point(index, byCode[dimension.code]?.[field] ?? 0).join(","))
    .join(" ");

  return (
    <div className="radar" role="img" aria-label="Graphique radar des six Types de Personnalité">
      <svg viewBox={`0 0 ${size} ${size}`}>
        {grid.map((points, index) => <polygon key={index} points={points} className="radar__grid" />)}
        {dimensions.map((dimension, index) => {
          const [x, y] = point(index, 100);
          return <line key={dimension.code} x1={center} y1={center} x2={x} y2={y} className="radar__axis" />;
        })}
        <polygon points={polygon} className="radar__shape" />
        {dimensions.map((dimension, index) => {
          const [x, y] = point(index, 118);
          return <text key={dimension.code} x={x} y={y} textAnchor="middle" dominantBaseline="middle">{dimension.shortName}</text>;
        })}
      </svg>
    </div>
  );
}
