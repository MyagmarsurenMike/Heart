"use server";

import { revalidatePath } from "next/cache";
import {
  createHabit,
  logEntry,
  setArchived,
  updateHabit,
  type Habit,
} from "@/server/storage/habits";
import { notifyStorageChange } from "@/server/index/watcher";

export async function createHabitAction(opts: {
  name: string;
  color?: string;
  frequency?: "daily" | "weekly";
  target_per_period?: number;
}): Promise<{ id: string }> {
  const h = await createHabit(opts);
  notifyStorageChange();
  revalidatePath("/habits");
  return { id: h.id };
}

export async function updateHabitAction(
  id: string,
  patch: Partial<Pick<Habit, "name" | "color" | "frequency" | "target_per_period">>
): Promise<void> {
  await updateHabit(id, patch);
  notifyStorageChange();
  revalidatePath("/habits");
  revalidatePath(`/habits/${id}`);
}

export async function archiveHabitAction(
  id: string,
  archived: boolean
): Promise<void> {
  await setArchived(id, archived);
  notifyStorageChange();
  revalidatePath("/habits");
}

export async function logEntryAction(opts: {
  habitId: string;
  dayKey: string;
  value?: number;
  note?: string;
}): Promise<void> {
  await logEntry(opts);
  notifyStorageChange();
  revalidatePath("/habits");
  revalidatePath(`/habits/${opts.habitId}`);
}
