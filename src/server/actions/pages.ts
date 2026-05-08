"use server";

import { revalidatePath } from "next/cache";
import { relative, sep } from "node:path";
import {
  createPage,
  deletePage,
  movePage,
  renamePage,
  reorderPage,
  savePageBody,
} from "@/server/storage/pages";
import { getStoragePaths } from "@/server/storage/paths";
import { notifyStorageChange } from "@/server/index/watcher";

export async function createPageAction(opts: {
  parentId: string | null;
  title: string;
}): Promise<{ id: string; url: string }> {
  const page = await createPage(opts);
  notifyStorageChange();
  revalidatePath("/", "layout");
  const { notes } = getStoragePaths();
  const url = "/" + relative(notes, page.folder).split(sep).join("/");
  return { id: page.id, url };
}

export async function renamePageAction(id: string, title: string): Promise<void> {
  await renamePage(id, title);
  notifyStorageChange();
  revalidatePath("/", "layout");
}

export async function deletePageAction(id: string): Promise<{ affected: number }> {
  const r = await deletePage(id);
  notifyStorageChange();
  revalidatePath("/", "layout");
  return { affected: r.affected };
}

export async function movePageAction(opts: {
  id: string;
  newParentId: string | null;
}): Promise<void> {
  await movePage(opts);
  notifyStorageChange();
  revalidatePath("/", "layout");
}

export async function savePageBodyAction(
  id: string,
  body: string
): Promise<{ ok: boolean; reason?: "missing" }> {
  try {
    const saved = await savePageBody(id, body);
    if (!saved) {
      // Page deleted/moved-to-trash while a debounced save was pending.
      // Don't surface as a runtime overlay — the user wanted it gone.
      console.warn(`[hearth] savePageBody skipped: ${id} no longer exists`);
      return { ok: false, reason: "missing" };
    }
    notifyStorageChange();
    return { ok: true };
  } catch (err) {
    console.error("[hearth] savePageBody failed", err);
    return { ok: false };
  }
  // No revalidatePath here — editor owns the body; revalidating mid-typing
  // would race with debounced saves. Sidebar mtime ordering will pick up
  // the change on the next natural re-render.
}

export async function reorderPageAction(opts: {
  id: string;
  beforeId: string | null;
  afterId: string | null;
}): Promise<void> {
  await reorderPage(opts);
  notifyStorageChange();
  revalidatePath("/", "layout");
}
