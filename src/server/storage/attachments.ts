import { promises as fs } from "node:fs";
import { join, resolve, sep, extname } from "node:path";
import { ulid } from "ulid";
import { getStoragePaths } from "./paths";

const MAX_BYTES = Number(process.env.HEARTH_MAX_UPLOAD_BYTES ?? 10 * 1024 * 1024);

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
};
const ALLOWED_MIMES = new Set(Object.values(MIME_BY_EXT));

export type AttachmentValidation =
  | { ok: true; ext: string; mime: string }
  | { ok: false; reason: string };

export function validateAttachment(opts: {
  size: number;
  mime: string;
  name: string;
}): AttachmentValidation {
  if (opts.size > MAX_BYTES)
    return { ok: false, reason: `file too large (max ${MAX_BYTES} bytes)` };
  const ext = extname(opts.name).toLowerCase();
  const inferred = MIME_BY_EXT[ext];
  if (!inferred) return { ok: false, reason: `unsupported extension ${ext}` };
  // Trust extension over client-provided mime for predictable serving;
  // also reject if the claimed mime isn't in the allow-list at all.
  const claimed = opts.mime.toLowerCase();
  if (claimed && !ALLOWED_MIMES.has(claimed) && claimed !== inferred) {
    return { ok: false, reason: `unsupported mime ${claimed}` };
  }
  return { ok: true, ext, mime: inferred };
}

// pageUrl: "/welcome" or "/projects/his-web" (no leading "//", no "..")
// Returns relative filename (e.g. "01KQVD...png") to embed in markdown.
export async function saveAttachment(opts: {
  pageUrl: string;
  suggestedName: string;
  data: Buffer;
}): Promise<{ filename: string; absPath: string; mime: string }> {
  const v = validateAttachment({
    size: opts.data.byteLength,
    mime: "",
    name: opts.suggestedName,
  });
  if (!v.ok) throw new Error(v.reason);
  const folder = resolvePageFolder(opts.pageUrl);
  await fs.mkdir(folder, { recursive: true });
  const filename = `${ulid()}${v.ext}`;
  const absPath = join(folder, filename);
  await fs.writeFile(absPath, opts.data);
  return { filename, absPath, mime: v.mime };
}

export async function readAttachment(
  pageUrl: string,
  filename: string
): Promise<{ data: Buffer; mime: string } | null> {
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    return null;
  }
  const ext = extname(filename).toLowerCase();
  const mime = MIME_BY_EXT[ext];
  if (!mime) return null;
  const folder = resolvePageFolder(pageUrl);
  const absPath = join(folder, filename);
  // Re-verify the resolved path didn't escape via symlinks.
  const { notes } = getStoragePaths();
  if (!absPath.startsWith(notes + sep) && absPath !== notes) return null;
  try {
    const data = await fs.readFile(absPath);
    return { data, mime };
  } catch {
    return null;
  }
}

function resolvePageFolder(pageUrl: string): string {
  const { notes } = getStoragePaths();
  const parts = pageUrl
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);
  for (const part of parts) {
    if (part === "." || part === ".." || part.startsWith(".")) {
      throw new Error(`invalid page path segment: ${part}`);
    }
  }
  const folder = resolve(notes, ...parts);
  if (!folder.startsWith(notes + sep) && folder !== notes) {
    throw new Error(`page path escapes notes root`);
  }
  return folder;
}
