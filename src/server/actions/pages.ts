"use server";

import { revalidatePath } from "next/cache";
import { relative, sep } from "node:path";
import {
  createPage,
  deletePage,
  movePage,
  renamePage,
  reorderPage,
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

export async function reorderPageAction(opts: {
  id: string;
  beforeId: string | null;
  afterId: string | null;
}): Promise<void> {
  await reorderPage(opts);
  notifyStorageChange();
  revalidatePath("/", "layout");
}
