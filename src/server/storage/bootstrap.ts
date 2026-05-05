import { promises as fs } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { ulid } from "ulid";
import { ensureStorageDirs } from "./paths";
import { safeWrite } from "@/lib/safe-write";

const WELCOME_BODY = `Welcome to Hearth.

Your data lives on disk in this folder. Notes are markdown, attachments live next to them, everything is plain files. Open the folder in VS Code, Obsidian, or Finder — same data, different view.

The app is just a nice UI on top.
`;

let bootstrapped: Promise<void> | null = null;

export function bootstrapStorage(): Promise<void> {
  bootstrapped ??= run();
  return bootstrapped;
}

async function run(): Promise<void> {
  const p = await ensureStorageDirs();
  const entries = await fs.readdir(p.notes);
  if (entries.some((e) => !e.startsWith("."))) return;
  const id = ulid();
  const now = new Date().toISOString();
  const fm = {
    id,
    title: "Welcome",
    icon: "🔥",
    created: now,
    updated: now,
    position: 1,
  };
  const file = matter.stringify(WELCOME_BODY, fm);
  await safeWrite(join(p.notes, "welcome", "index.md"), file);
}
