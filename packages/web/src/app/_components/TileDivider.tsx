// A repeating scallop, the shape an azulejo border tile traces, standing in
// for the straight hairline a section boundary would otherwise get.
function scallopPath(count: number, unit: number, height: number): string {
  const mid = height / 2;
  let d = `M0,${height} L0,${mid}`;
  for (let i = 0; i < count; i++) {
    const x0 = i * unit;
    const xMid = x0 + unit / 2;
    const x1 = x0 + unit;
    d += ` Q${xMid},0 ${x1},${mid}`;
  }
  d += ` L${count * unit},${height} Z`;
  return d;
}

const SCALLOP_COUNT = 24;
const SCALLOP_UNIT = 40;
const SCALLOP_HEIGHT = 28;
const PATH = scallopPath(SCALLOP_COUNT, SCALLOP_UNIT, SCALLOP_HEIGHT);

export function TileDivider() {
  return (
    <svg
      viewBox={`0 0 ${SCALLOP_COUNT * SCALLOP_UNIT} ${SCALLOP_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 h-6 w-full text-limestone sm:h-7"
    >
      <path d={PATH} fill="currentColor" />
    </svg>
  );
}
