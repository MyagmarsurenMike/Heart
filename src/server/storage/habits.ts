import { promises as fs } from "node:fs";
import { join } from "node:path";
import { ulid } from "ulid";
import { z } from "zod";
import { ensureStorageDirs, getStoragePaths } from "./paths";
import { safeWrite } from "@/lib/safe-write";

export const habitSchema = z.object({
  id: z.string(),
  name: z.string(),
  frequency: z.enum(["daily", "weekly"]).default("daily"),
  color: z.string().default("#06B6D4"),
  target_per_period: z.number().int().positive().default(1),
  archived: z.boolean().default(false),
  created: z.string(),
});
export type Habit = z.infer<typeof habitSchema>;

export const habitsFileSchema = z.array(habitSchema);

export const entrySchema = z.object({
  value: z.number().min(0),
  note: z.string().optional(),
});
export type Entry = z.infer<typeof entrySchema>;

export const monthEntriesSchema = z.record(
  z.string(),
  z.record(z.string(), entrySchema)
);
export type MonthEntries = z.infer<typeof monthEntriesSchema>;

function habitsFilePath(): string {
  return join(getStoragePaths().habits, "habits.json");
}
function entriesFolder(): string {
  return join(getStoragePaths().habits, "entries");
}
function monthFile(yearMonth: string): string {
  return join(entriesFolder(), `${yearMonth}.json`);
}

export async function listHabits(opts?: {
  includeArchived?: boolean;
}): Promise<Habit[]> {
  await ensureStorageDirs();
  const path = habitsFilePath();
  let raw: string;
  try {
    raw = await fs.readFile(path, "utf8");
  } catch {
    return [];
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`habits.json is not valid JSON (${path})`);
  }
  const result = habitsFileSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`habits.json failed validation: ${result.error.message}`);
  }
  return result.data.filter((h) => opts?.includeArchived || !h.archived);
}

async function writeHabits(all: Habit[]): Promise<void> {
  await safeWrite(habitsFilePath(), JSON.stringify(all, null, 2) + "\n");
}

export async function findHabit(id: string): Promise<Habit | null> {
  const all = await listHabits({ includeArchived: true });
  return all.find((h) => h.id === id) ?? null;
}

export async function createHabit(opts: {
  name: string;
  frequency?: "daily" | "weekly";
  color?: string;
  target_per_period?: number;
}): Promise<Habit> {
  const all = await listHabits({ includeArchived: true });
  const habit: Habit = habitSchema.parse({
    id: ulid(),
    name: opts.name.trim() || "Untitled habit",
    frequency: opts.frequency ?? "daily",
    color: opts.color ?? "#06B6D4",
    target_per_period: opts.target_per_period ?? 1,
    archived: false,
    created: new Date().toISOString(),
  });
  all.push(habit);
  await writeHabits(all);
  return habit;
}

export async function updateHabit(
  id: string,
  patch: Partial<Pick<Habit, "name" | "color" | "frequency" | "target_per_period">>
): Promise<Habit> {
  const all = await listHabits({ includeArchived: true });
  const idx = all.findIndex((h) => h.id === id);
  if (idx < 0) throw new Error(`updateHabit: ${id} not found`);
  const next = habitSchema.parse({ ...all[idx], ...patch });
  all[idx] = next;
  await writeHabits(all);
  return next;
}

export async function setArchived(id: string, archived: boolean): Promise<Habit> {
  const all = await listHabits({ includeArchived: true });
  const idx = all.findIndex((h) => h.id === id);
  if (idx < 0) throw new Error(`setArchived: ${id} not found`);
  all[idx] = { ...all[idx], archived };
  await writeHabits(all);
  return all[idx];
}

export async function getMonthEntries(yearMonth: string): Promise<MonthEntries> {
  await ensureStorageDirs();
  await fs.mkdir(entriesFolder(), { recursive: true });
  let raw: string;
  try {
    raw = await fs.readFile(monthFile(yearMonth), "utf8");
  } catch {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`entries/${yearMonth}.json is not valid JSON`);
  }
  const result = monthEntriesSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `entries/${yearMonth}.json failed validation: ${result.error.message}`
    );
  }
  return result.data;
}

async function writeMonthEntries(
  yearMonth: string,
  data: MonthEntries
): Promise<void> {
  await fs.mkdir(entriesFolder(), { recursive: true });
  await safeWrite(monthFile(yearMonth), JSON.stringify(data, null, 2) + "\n");
}

function ymOf(dayKey: string): string {
  return dayKey.slice(0, 7); // "YYYY-MM"
}

export async function logEntry(opts: {
  habitId: string;
  dayKey: string; // YYYY-MM-DD
  value?: number; // default toggles between 0 and 1
  note?: string;
}): Promise<Entry> {
  const ym = ymOf(opts.dayKey);
  const month = await getMonthEntries(ym);
  const day = month[opts.dayKey] ?? {};
  const existing = day[opts.habitId];
  let nextValue: number;
  if (typeof opts.value === "number") {
    nextValue = opts.value;
  } else {
    nextValue = (existing?.value ?? 0) > 0 ? 0 : 1;
  }
  const next: Entry = entrySchema.parse({
    value: nextValue,
    ...(opts.note != null ? { note: opts.note } : {}),
  });
  if (next.value === 0 && next.note == null) {
    delete day[opts.habitId];
  } else {
    day[opts.habitId] = next;
  }
  if (Object.keys(day).length === 0) {
    delete month[opts.dayKey];
  } else {
    month[opts.dayKey] = day;
  }
  await writeMonthEntries(ym, month);
  return next;
}

export async function getEntriesForRange(opts: {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}): Promise<Record<string, Record<string, Entry>>> {
  const months = monthsBetween(opts.from, opts.to);
  const out: Record<string, Record<string, Entry>> = {};
  for (const ym of months) {
    const m = await getMonthEntries(ym);
    for (const [day, byHabit] of Object.entries(m)) {
      if (day >= opts.from && day <= opts.to) out[day] = byHabit;
    }
  }
  return out;
}

function monthsBetween(fromKey: string, toKey: string): string[] {
  const months: string[] = [];
  let [y, m] = fromKey.split("-").map(Number);
  const [yEnd, mEnd] = toKey.split("-").map(Number);
  while (y < yEnd || (y === yEnd && m <= mEnd)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}
