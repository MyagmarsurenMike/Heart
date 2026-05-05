import { NextResponse } from "next/server";
import {
  readAttachment,
  saveAttachment,
} from "@/server/storage/attachments";
import { notifyStorageChange } from "@/server/index/watcher";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ path: string[] }> };

function splitPath(parts: string[]): { pageUrl: string; filename: string } | null {
  if (parts.length < 2) return null;
  const filename = parts[parts.length - 1];
  const pageUrl = "/" + parts.slice(0, -1).join("/");
  return { pageUrl, filename };
}

export async function GET(_req: Request, ctx: Ctx): Promise<Response> {
  const { path } = await ctx.params;
  const split = splitPath(path);
  if (!split) return new Response("not found", { status: 404 });
  const result = await readAttachment(split.pageUrl, split.filename);
  if (!result) return new Response("not found", { status: 404 });
  return new Response(new Uint8Array(result.data), {
    headers: {
      "Content-Type": result.mime,
      "Content-Length": String(result.data.byteLength),
      "Cache-Control": "private, max-age=60",
    },
  });
}

export async function POST(req: Request, ctx: Ctx): Promise<Response> {
  const { path } = await ctx.params;
  const pageUrl = "/" + path.join("/");
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "invalid form" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const r = await saveAttachment({
      pageUrl,
      suggestedName: file.name || "upload.bin",
      data: buf,
    });
    notifyStorageChange();
    return NextResponse.json({ filename: r.filename });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "save failed" },
      { status: 400 }
    );
  }
}
