import { promises as fs } from "node:fs";
import { relative, sep } from "node:path";
import { listPages } from "@/server/storage/pages";
import { getStoragePaths } from "@/server/storage/paths";
import { safeWrite } from "@/lib/safe-write";
import type { HearthIndex, IndexedPage } from "./types";

export async function buildIndex(): Promise<HearthIndex> {
  const { notes, hearth, index } = getStoragePaths();
  await fs.mkdir(hearth, { recursive: true });
  const pages = await listPages();
  const idBySlugPath = new Map<string, string>();
  for (const p of pages) {
    const rel = relative(notes, p.path).split(sep).slice(0, -1).join("/");
    idBySlugPath.set(rel, p.id);
  }
  const indexed: IndexedPage[] = pages.map((p) => {
    const rel = relative(notes, p.path).split(sep).slice(0, -1);
    const parentRel = rel.slice(0, -1).join("/");
    const parent_id = parentRel ? idBySlugPath.get(parentRel) ?? null : null;
    return {
      id: p.id,
      title: p.title,
      icon: p.icon,
      slug: p.slug,
      parent_id,
      parent_slug: p.parentSlug,
      path: p.path,
      url: "/" + rel.join("/"),
      position: p.position ?? Number.POSITIVE_INFINITY,
      updated: p.updated ?? null,
      mtime: p.bodyMtime,
    };
  });
  const out: HearthIndex = {
    schema_version: 1,
    built_at: new Date().toISOString(),
    pages: indexed,
  };
  await safeWrite(index, JSON.stringify(out, null, 2));
  return out;
}
