import { promises as fs } from "node:fs";
import { join, relative, sep } from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { getStoragePaths } from "./paths";

export const pageFrontmatterSchema = z.object({
  id: z.string(),
  title: z.string(),
  icon: z.string().optional(),
  parent_id: z.string().optional(),
  position: z.number().optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
});
export type PageFrontmatter = z.infer<typeof pageFrontmatterSchema>;

export type Page = PageFrontmatter & {
  slug: string;
  path: string; // absolute path to index.md
  parentSlug: string | null;
  body: string;
  bodyMtime: number;
};

export async function listPages(): Promise<Page[]> {
  const { notes } = getStoragePaths();
  const out: Page[] = [];
  await walk(notes, notes, out);
  return out.sort(comparePages);
}

async function walk(notesRoot: string, dir: string, out: Page[]): Promise<void> {
  let entries: import("node:fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (!entry.isDirectory()) continue;
    const folder = join(dir, entry.name);
    const indexPath = join(folder, "index.md");
    try {
      const stat = await fs.stat(indexPath);
      const raw = await fs.readFile(indexPath, "utf8");
      const parsed = matter(raw);
      const fm = pageFrontmatterSchema.safeParse(parsed.data);
      if (fm.success) {
        const rel = relative(notesRoot, folder).split(sep);
        const slug = rel[rel.length - 1];
        const parentSlug = rel.length > 1 ? rel[rel.length - 2] : null;
        out.push({
          ...fm.data,
          slug,
          path: indexPath,
          parentSlug,
          body: parsed.content,
          bodyMtime: stat.mtimeMs,
        });
      }
    } catch {
      // No index.md — keep walking; nested-only folders are allowed.
    }
    await walk(notesRoot, folder, out);
  }
}

function comparePages(a: Page, b: Page): number {
  const ap = a.position ?? Number.POSITIVE_INFINITY;
  const bp = b.position ?? Number.POSITIVE_INFINITY;
  if (ap !== bp) return ap - bp;
  return a.title.localeCompare(b.title);
}
