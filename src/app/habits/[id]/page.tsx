import { notFound } from "next/navigation";
import { findHabit, getEntriesForRange } from "@/server/storage/habits";
import {
  computeStreaks,
  dayKey,
  shiftDays,
} from "@/domain/habits/streaks";
import { Breadcrumb } from "@/components/workspace/breadcrumb";
import { Heatmap } from "@/components/habits/heatmap";
import { HabitCheckbox } from "@/components/habits/habit-checkbox";
import { EditHabitButton } from "@/components/habits/habit-form-dialog";
import { ArchiveButton } from "@/components/habits/archive-button";

export const dynamic = "force-dynamic";

type Params = { id: string };

export default async function HabitDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { id } = await params;
  const habit = await findHabit(id);
  if (!habit) notFound();

  const today = new Date();
  const todayKey = dayKey(today);
  const from = shiftDays(today, -(53 * 7 - 1));
  const fromKey = dayKey(from);
  const range = await getEntriesForRange({ from: fromKey, to: todayKey });
  const entries: Record<string, number> = {};
  for (const [day, byHabit] of Object.entries(range)) {
    const e = byHabit[habit.id];
    if (e) entries[day] = e.value;
  }
  const stats = computeStreaks({ entries, today, from });
  const checkedToday = (entries[todayKey] ?? 0) > 0;

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-8 sm:px-6 sm:py-12 md:px-8">
      <Breadcrumb
        items={[
          { label: "habits", href: "/habits" },
          { label: habit.name },
        ]}
      />
      <header className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="inline-block h-3 w-3 rounded-sm"
            style={{ background: habit.color }}
          />
          <h1 className="text-[22px] font-medium leading-tight text-[var(--text-primary)]">
            {habit.name}
          </h1>
          {habit.archived ? (
            <span className="rounded-sm border border-[var(--border-default)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              archived
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <EditHabitButton
            habit={{
              id: habit.id,
              name: habit.name,
              color: habit.color,
              frequency: habit.frequency,
              target_per_period: habit.target_per_period,
            }}
          />
          <ArchiveButton id={habit.id} archived={habit.archived} />
        </div>
      </header>

      <section className="flex items-center gap-4 rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3">
        <HabitCheckbox
          habitId={habit.id}
          dayKey={todayKey}
          checked={checkedToday}
          color={habit.color}
          size="md"
        />
        <div className="flex flex-col">
          <span className="tiny-label">today</span>
          <span className="text-[12px] text-[var(--text-tertiary)]">
            {checkedToday ? "checked in" : "tap to log"}
          </span>
        </div>
      </section>

      <section className="grid grid-cols-3 gap-3">
        <Stat label="current streak" value={`${stats.currentStreak}d`} />
        <Stat label="longest streak" value={`${stats.longestStreak}d`} />
        <Stat
          label="completion"
          value={`${Math.round(stats.completionRate * 100)}%`}
          hint={`${stats.daysLogged}/${stats.rangeDays} days`}
        />
      </section>

      <section className="flex flex-col gap-3 rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-4">
        <span className="tiny-label">last 53 weeks</span>
        <div className="overflow-x-auto">
          <Heatmap entries={entries} color={habit.color} today={today} />
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3">
      <span className="tiny-label">{label}</span>
      <span
        className="text-[18px] font-medium tabular-nums text-[var(--text-primary)]"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </span>
      {hint ? (
        <span className="text-[10px] text-[var(--text-muted)]">{hint}</span>
      ) : null}
    </div>
  );
}
