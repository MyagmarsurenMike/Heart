import {
  dayKey,
  shiftDays,
  type EntriesByDate,
} from "@/domain/habits/streaks";

const CELL = 11;
const GAP = 2;
const COLS = 53;
const ROWS = 7;

export function Heatmap({
  entries,
  color,
  today,
}: {
  entries: EntriesByDate;
  color: string;
  today: Date;
}) {
  // End on the most recent Saturday so each column is a full Sun–Sat week.
  const end = new Date(today);
  const dow = end.getDay();
  if (dow !== 6) end.setDate(end.getDate() + (6 - dow));
  const start = shiftDays(end, -(COLS * ROWS - 1));

  const width = COLS * (CELL + GAP) - GAP;
  const height = ROWS * (CELL + GAP) - GAP;

  const cells: { x: number; y: number; key: string; filled: boolean }[] = [];
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      const offset = col * ROWS + row;
      const date = shiftDays(start, offset);
      if (date > today) continue;
      const key = dayKey(date);
      const filled = (entries[key] ?? 0) > 0;
      cells.push({
        x: col * (CELL + GAP),
        y: row * (CELL + GAP),
        key,
        filled,
      });
    }
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="check-in heatmap"
    >
      {cells.map((c) => (
        <rect
          key={c.key}
          x={c.x}
          y={c.y}
          width={CELL}
          height={CELL}
          rx={2}
          fill={c.filled ? color : "var(--bg-secondary)"}
          stroke="var(--border-subtle)"
          strokeWidth={0.5}
        >
          <title>
            {c.key}
            {c.filled ? " · done" : ""}
          </title>
        </rect>
      ))}
    </svg>
  );
}
