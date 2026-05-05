import { promises as fs } from "node:fs";
import { join } from "node:path";
import { getStoragePaths } from "@/server/storage/paths";
import { bootstrapStorage } from "@/server/storage/bootstrap";
import { buildIndex } from "./builder";
import type { HearthIndex } from "./types";

export async function getIndex(): Promise<HearthIndex> {
  await bootstrapStorage();
  const { index } = getStoragePaths();
  let parsed: HearthIndex | null = null;
  try {
    const raw = await fs.readFile(index, "utf8");
    parsed = JSON.parse(raw) as HearthIndex;
    if (parsed.schema_version !== 1) parsed = null;
  } catch {
    parsed = null;
  }
  if (!parsed) return buildIndex();
  if (await isStale(parsed)) return buildIndex();
  return parsed;
}

async function isStale(idx: HearthIndex): Promise<boolean> {
  const { notes } = getStoragePaths();
  const newest = await newestMtime(notes);
  if (newest == null) return false;
  const built = Date.parse(idx.built_at);
  return Number.isFinite(built) ? newest > built : true;
}

async function newestMtime(dir: string): Promise<number | null> {
  let max: number | null = null;
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await newestMtime(full);
      if (sub != null && (max == null || sub > max)) max = sub;
    } else if (entry.isFile()) {
      const stat = await fs.stat(full);
      if (max == null || stat.mtimeMs > max) max = stat.mtimeMs;
    }
  }
  return max;
}
