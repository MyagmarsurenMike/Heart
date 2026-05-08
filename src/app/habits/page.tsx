import Link from "next/link";
import { listHabits } from "@/server/storage/habits";
import { getEntriesForRange } from "@/server/storage/habits";
import { dayKey, shiftDays, computeStreaks } from "@/domain/habits/streaks";
import { Breadcrumb } from "@/components/workspace/breadcrumb";
import { HabitCheckbox } from "@/components/habits/habit-checkbox";
import { NewHabitButton } from "@/components/habits/habit-form-dialog";

export const dynamic = "force-dynamic";

export default async function HabitsPage() {
  const habits = await listHabits();
  const today = new Date();
  const todayKey = dayKey(today);
  const from = shiftDays(today, -(53 * 7 - 1));
  const fromKey = dayKey(from);
  const entries = await getEntriesForRange({ from: fromKey, to: todayKey });

  const habitEntries = (id: string) => {
    const out: Record<string, number> = {};
    for (const [day, byHabit] of Object.entries(entries)) {
      const e = byHabit[id];
      if (e) out[day] = e.value;
    }
    return out;
  };

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12 md:px-8">
      <Breadcrumb items={[{ label: "habits" }]} />
      <header className="flex items-center justify-between">
        <h1 className="text-[22px] font-medium leading-tight text-[var(--text-primary)]">
          Habits
        </h1>
        <NewHabitButton />
      </header>
      {habits.length === 0 ? (
        <p className="text-[12px] text-[var(--text-disabled)]">
          no habits yet — add one to start tracking.
        </p>
      ) : (
        <ul className="flex flex-col">
          {habits.map((h) => {
            const map = habitEntries(h.id);
            const stats = computeStreaks({ entries: map, today, from });
            const checked = (map[todayKey] ?? 0) > 0;
            return (
              <li
                key={h.id}
                className="flex items-center gap-3 border-b border-[var(--border-subtle)] py-3"
              >
                <HabitCheckbox
                  habitId={h.id}
                  dayKey={todayKey}
                  checked={checked}
                  color={h.color}
                  size="md"
                />
                <Link
                  href={`/habits/${h.id}`}
                  className="flex flex-1 items-center justify-between min-w-0"
                >
                  <span className="truncate text-[13px] text-[var(--text-primary)]">
                    {h.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-3 text-[11px] text-[var(--text-tertiary)]">
                    <span title="current streak">
                      {stats.currentStreak}d streak
                    </span>
                    <span title="completion rate over 53 weeks">
                      {Math.round(stats.completionRate * 100)}%
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
