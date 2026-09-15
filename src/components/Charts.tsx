import type { DimensionDefinition, DimensionScore } from "../lib/model";

export function ScoreBars({
  scores,
  dimensions,
  field,
  preserveOrder = false,
}: {
  scores: DimensionScore[];
  dimensions: DimensionDefinition[];
  field: "structure" | "dynamique";
  preserveOrder?: boolean;
}) {
  const definitions = Object.fromEntries(dimensions.map((item) => [item.code, item]));
  const rows = preserveOrder ? [...scores] : [...scores].sort((a, b) => b[field] - a[field]);
  return (
    <div className="score-bars">
      {rows.map((score) => {
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
  field,
}: {
  scores: DimensionScore[];
  dimensions: DimensionDefinition[];
  field?: "structure" | "dynamique";
}) {
  const size = 360;
  const center = 180;
  const radius = 112;
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

  const structurePolygon = dimensions
    .map((dimension, index) => point(index, byCode[dimension.code]?.structure ?? 0).join(","))
    .join(" ");

  const dynamicPolygon = dimensions
    .map((dimension, index) => point(index, byCode[dimension.code]?.dynamique ?? 0).join(","))
    .join(" ");

  const singlePolygon = dimensions
    .map((dimension, index) => point(index, byCode[dimension.code]?.[field ?? "structure"] ?? 0).join(","))
    .join(" ");

  return (
    <div className="radar" role="img" aria-label="Cartographie radar des six Types de Personnalité">
      {!field && (
        <div className="radar__legend">
          <span><i className="radar__legend-structure" /> Structure / Base</span>
          <span><i className="radar__legend-dynamic" /> Dynamique de Phase</span>
        </div>
      )}
      <svg viewBox={`0 0 ${size} ${size}`}>
        {grid.map((points, index) => <polygon key={index} points={points} className="radar__grid" />)}
        {dimensions.map((dimension, index) => {
          const [x, y] = point(index, 100);
          return <line key={dimension.code} x1={center} y1={center} x2={x} y2={y} className="radar__axis" />;
        })}

        {field ? (
          <polygon points={singlePolygon} className="radar__shape" />
        ) : (
          <>
            <polygon points={structurePolygon} className="radar__shape radar__shape--structure" />
            <polygon points={dynamicPolygon} className="radar__shape radar__shape--dynamic" />
            {dimensions.map((dimension, index) => {
              const [sx, sy] = point(index, byCode[dimension.code]?.structure ?? 0);
              const [dx, dy] = point(index, byCode[dimension.code]?.dynamique ?? 0);
              return (
                <g key={`${dimension.code}-points`}>
                  <circle cx={sx} cy={sy} r={4} className="radar__point radar__point--structure" />
                  <circle cx={dx} cy={dy} r={4} className="radar__point radar__point--dynamic" />
                </g>
              );
            })}
          </>
        )}

        {dimensions.map((dimension, index) => {
          const [x, y] = point(index, 122);
          return <text key={dimension.code} x={x} y={y} textAnchor="middle" dominantBaseline="middle">{dimension.shortName}</text>;
        })}
      </svg>
    </div>
  );
}
