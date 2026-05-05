import { promises as fs } from "node:fs";
import { join, relative, sep, dirname, basename } from "node:path";
import matter from "gray-matter";
import { ulid } from "ulid";
import { z } from "zod";
import { getStoragePaths } from "./paths";
import { safeWrite } from "@/lib/safe-write";
import { makeSlug } from "@/lib/slug";

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
  folder: string; // absolute path to the page folder
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
          folder,
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

export async function findPageById(id: string): Promise<Page | null> {
  const all = await listPages();
  return all.find((p) => p.id === id) ?? null;
}

async function uniqueSlug(parentDir: string, base: string): Promise<string> {
  let n = 1;
  let candidate = base;
  while (true) {
    const target = join(parentDir, candidate);
    try {
      await fs.access(target);
      n += 1;
      candidate = `${base}-${n}`;
    } catch {
      return candidate;
    }
  }
}

async function siblings(parentDir: string): Promise<Page[]> {
  const all = await listPages();
  return all.filter((p) => dirname(p.folder) === parentDir);
}

async function nextPosition(parentDir: string): Promise<number> {
  const sibs = await siblings(parentDir);
  const max = sibs.reduce(
    (acc, s) => (s.position != null && s.position > acc ? s.position : acc),
    0
  );
  return Math.floor(max + 1);
}

function writePage(
  path: string,
  fm: PageFrontmatter,
  body: string
): Promise<void> {
  return safeWrite(path, matter.stringify(body, fm));
}

async function readPage(path: string): Promise<{ fm: PageFrontmatter; body: string }> {
  const raw = await fs.readFile(path, "utf8");
  const parsed = matter(raw);
  const fm = pageFrontmatterSchema.parse(parsed.data);
  return { fm, body: parsed.content };
}

export async function createPage(opts: {
  parentId: string | null;
  title: string;
}): Promise<Page> {
  const { notes } = getStoragePaths();
  const parentDir =
    opts.parentId == null
      ? notes
      : (await findPageById(opts.parentId))?.folder ?? notes;
  const parentPage =
    opts.parentId == null ? null : await findPageById(opts.parentId);
  if (opts.parentId != null && !parentPage) {
    throw new Error(`createPage: parent ${opts.parentId} not found`);
  }
  const slug = await uniqueSlug(parentDir, makeSlug(opts.title || "untitled"));
  const id = ulid();
  const now = new Date().toISOString();
  const folder = join(parentDir, slug);
  const path = join(folder, "index.md");
  const position = await nextPosition(parentDir);
  const fm: PageFrontmatter = {
    id,
    title: opts.title || "Untitled",
    created: now,
    updated: now,
    position,
    ...(parentPage ? { parent_id: parentPage.id } : {}),
  };
  await writePage(path, fm, "");
  const stat = await fs.stat(path);
  return {
    ...fm,
    slug,
    path,
    folder,
    parentSlug: parentPage?.slug ?? null,
    body: "",
    bodyMtime: stat.mtimeMs,
  };
}

export async function renamePage(id: string, newTitle: string): Promise<Page> {
  const page = await findPageById(id);
  if (!page) throw new Error(`renamePage: page ${id} not found`);
  const trimmed = newTitle.trim();
  if (!trimmed) throw new Error("renamePage: title cannot be empty");
  const parentDir = dirname(page.folder);
  const desiredSlug = makeSlug(trimmed);
  const now = new Date().toISOString();
  let folder = page.folder;
  let path = page.path;
  if (desiredSlug !== page.slug) {
    const newSlug = await uniqueSlug(parentDir, desiredSlug);
    const newFolder = join(parentDir, newSlug);
    await fs.rename(page.folder, newFolder);
    folder = newFolder;
    path = join(newFolder, "index.md");
  }
  const { fm, body } = await readPage(path);
  fm.title = trimmed;
  fm.updated = now;
  await writePage(path, fm, body);
  const stat = await fs.stat(path);
  return {
    ...fm,
    slug: basename(folder),
    path,
    folder,
    parentSlug: page.parentSlug,
    body,
    bodyMtime: stat.mtimeMs,
  };
}

export async function deletePage(id: string): Promise<{ trashedTo: string; affected: number }> {
  const page = await findPageById(id);
  if (!page) throw new Error(`deletePage: page ${id} not found`);
  const all = await listPages();
  const affected = countDescendants(page, all) + 1;
  const { trash } = getStoragePaths();
  const stamp = Date.now();
  const dest = join(trash, `${stamp}-${page.id}-${page.slug}`);
  await fs.mkdir(trash, { recursive: true });
  await fs.rename(page.folder, dest);
  return { trashedTo: dest, affected };
}

function countDescendants(page: Page, all: Page[]): number {
  let count = 0;
  for (const p of all) {
    if (p.id === page.id) continue;
    if (p.folder.startsWith(page.folder + sep)) count += 1;
  }
  return count;
}

export async function movePage(opts: {
  id: string;
  newParentId: string | null;
}): Promise<Page> {
  const page = await findPageById(opts.id);
  if (!page) throw new Error(`movePage: page ${opts.id} not found`);
  const { notes } = getStoragePaths();
  const newParent =
    opts.newParentId == null ? null : await findPageById(opts.newParentId);
  if (opts.newParentId != null && !newParent) {
    throw new Error(`movePage: parent ${opts.newParentId} not found`);
  }
  if (
    newParent &&
    (newParent.id === page.id ||
      newParent.folder.startsWith(page.folder + sep))
  ) {
    throw new Error("movePage: cannot move a page into itself or its descendant");
  }
  const newParentDir = newParent ? newParent.folder : notes;
  if (newParentDir === dirname(page.folder)) return page;
  const newSlug = await uniqueSlug(newParentDir, page.slug);
  const newFolder = join(newParentDir, newSlug);
  await fs.rename(page.folder, newFolder);
  const newPath = join(newFolder, "index.md");
  const { fm, body } = await readPage(newPath);
  if (newParent) fm.parent_id = newParent.id;
  else delete fm.parent_id;
  fm.position = await nextPosition(newParentDir);
  fm.updated = new Date().toISOString();
  await writePage(newPath, fm, body);
  const stat = await fs.stat(newPath);
  return {
    ...fm,
    slug: newSlug,
    path: newPath,
    folder: newFolder,
    parentSlug: newParent?.slug ?? null,
    body,
    bodyMtime: stat.mtimeMs,
  };
}

export async function reorderPage(opts: {
  id: string;
  beforeId: string | null;
  afterId: string | null;
}): Promise<Page> {
  const page = await findPageById(opts.id);
  if (!page) throw new Error(`reorderPage: page ${opts.id} not found`);
  const before = opts.beforeId ? await findPageById(opts.beforeId) : null;
  const after = opts.afterId ? await findPageById(opts.afterId) : null;
  const beforePos = before?.position ?? 0;
  const afterPos =
    after?.position ?? Math.max(beforePos + 2, beforePos + 2);
  const newPosition = (beforePos + afterPos) / 2;
  const { fm, body } = await readPage(page.path);
  fm.position = newPosition;
  fm.updated = new Date().toISOString();
  await writePage(page.path, fm, body);
  const stat = await fs.stat(page.path);
  return { ...page, position: newPosition, body, bodyMtime: stat.mtimeMs };
}
