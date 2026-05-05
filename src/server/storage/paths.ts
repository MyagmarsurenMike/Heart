import { promises as fs } from "node:fs";
import { resolve, join } from "node:path";

const DEFAULT_ROOT = "./storage";

export type StoragePaths = {
  root: string;
  notes: string;
  habits: string;
  finance: string;
  calendar: string;
  hearth: string;
  index: string;
  trash: string;
  backups: string;
};

let cached: StoragePaths | null = null;

export function getStoragePaths(): StoragePaths {
  if (cached) return cached;
  const root = resolve(process.env.HEARTH_STORAGE_PATH || DEFAULT_ROOT);
  cached = {
    root,
    notes: join(root, "notes"),
    habits: join(root, "habits"),
    finance: join(root, "finance"),
    calendar: join(root, "calendar"),
    hearth: join(root, ".hearth"),
    index: join(root, ".hearth", "index.json"),
    trash: join(root, ".hearth", "trash"),
    backups: join(root, ".hearth", "backups"),
  };
  return cached;
}

export async function ensureStorageDirs(): Promise<StoragePaths> {
  const p = getStoragePaths();
  await Promise.all([
    fs.mkdir(p.notes, { recursive: true }),
    fs.mkdir(p.habits, { recursive: true }),
    fs.mkdir(p.finance, { recursive: true }),
    fs.mkdir(p.calendar, { recursive: true }),
    fs.mkdir(p.trash, { recursive: true }),
    fs.mkdir(p.backups, { recursive: true }),
  ]);
  return p;
}
