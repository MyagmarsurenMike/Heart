// Markdown stores attachments by relative filename so files render the
// same in Obsidian/VS Code as in Hearth. The editor shows them via the
// /api/attachment route. These helpers translate between the two.

const IMG_RE = /!\[([^\]]*)\]\(([^)]+?)\)/g;

function trimSlashes(s: string): string {
  return s.replace(/^\/+|\/+$/g, "");
}

function isAbsoluteOrExternal(src: string): boolean {
  return /^(https?:|data:|\/)/i.test(src);
}

export function attachmentPrefix(pageUrl: string): string {
  return `/api/attachment/${trimSlashes(pageUrl)}/`;
}

// Inbound (file → editor): rewrite plain filenames into API URLs.
export function rewriteForEditor(md: string, pageUrl: string): string {
  const prefix = attachmentPrefix(pageUrl);
  return md.replace(IMG_RE, (full, alt: string, src: string) => {
    if (isAbsoluteOrExternal(src)) return full;
    return `![${alt}](${prefix}${encodeURIComponent(src)})`;
  });
}

// Outbound (editor → file): strip API prefix back to relative filename.
export function rewriteForDisk(md: string, pageUrl: string): string {
  const prefix = attachmentPrefix(pageUrl);
  return md.replace(IMG_RE, (full, alt: string, src: string) => {
    if (!src.startsWith(prefix)) return full;
    const filename = decodeURIComponent(src.slice(prefix.length));
    return `![${alt}](${filename})`;
  });
}

export async function uploadAttachment(
  pageUrl: string,
  file: File,
  fallbackName?: string
): Promise<string> {
  const fd = new FormData();
  const named =
    file.name && file.name.length > 0
      ? file
      : new File([file], fallbackName ?? "upload.png", { type: file.type });
  fd.append("file", named);
  const res = await fetch(`/api/attachment${pageUrl}`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error(`upload failed: ${res.status}`);
  const json = (await res.json()) as { filename: string };
  return json.filename;
}
