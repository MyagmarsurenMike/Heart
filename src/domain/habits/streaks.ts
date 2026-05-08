// Pure streak / completion-rate calculations. No I/O, no Date.now() —
// callers pass `today`. Tested by example fixtures in the page route.

export type DayKey = string; // YYYY-MM-DD

export type EntriesByDate = Record<DayKey, number>; // value count for the habit

export type StreakStats = {
  currentStreak: number;
  longestStreak: number;
  completionRate: number; // 0..1 over [from, to]
  daysLogged: number;
  rangeDays: number;
};

export function dayKey(d: Date): DayKey {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function shiftDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}

export function eachDay(from: Date, to: Date): DayKey[] {
  const days: DayKey[] = [];
  let cursor = new Date(from);
  while (cursor <= to) {
    days.push(dayKey(cursor));
    cursor = shiftDays(cursor, 1);
  }
  return days;
}

export function computeStreaks(opts: {
  entries: EntriesByDate;
  today: Date;
  from: Date;
}): StreakStats {
  const todayKey = dayKey(opts.today);
  const allDays = eachDay(opts.from, opts.today);

  // Walk backwards from today for currentStreak.
  let currentStreak = 0;
  let cursor = new Date(opts.today);
  while (true) {
    const k = dayKey(cursor);
    if ((opts.entries[k] ?? 0) > 0) {
      currentStreak += 1;
      cursor = shiftDays(cursor, -1);
      if (cursor < opts.from) break;
    } else if (k === todayKey) {
      // Today not yet checked — try yesterday.
      cursor = shiftDays(cursor, -1);
    } else {
      break;
    }
  }

  // Sliding longest streak across the whole range.
  let longestStreak = 0;
  let run = 0;
  for (const k of allDays) {
    if ((opts.entries[k] ?? 0) > 0) {
      run += 1;
      if (run > longestStreak) longestStreak = run;
    } else {
      run = 0;
    }
  }

  const daysLogged = allDays.reduce(
    (acc, k) => acc + ((opts.entries[k] ?? 0) > 0 ? 1 : 0),
    0
  );
  const rangeDays = allDays.length;
  const completionRate = rangeDays === 0 ? 0 : daysLogged / rangeDays;
  return { currentStreak, longestStreak, completionRate, daysLogged, rangeDays };
}
