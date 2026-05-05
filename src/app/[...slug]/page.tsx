import { promises as fs } from "node:fs";
import matter from "gray-matter";
import { notFound } from "next/navigation";
import { getIndex } from "@/server/index/loader";
import { Breadcrumb, type Crumb } from "@/components/workspace/breadcrumb";
import { Editor } from "@/components/editor/editor";

type Params = { slug: string[] };

export default async function PagePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const url = "/" + slug.join("/");
  const index = await getIndex();
  const page = index.pages.find((p) => p.url === url);
  if (!page) notFound();

  const raw = await fs.readFile(page.path, "utf8");
  const body = matter(raw).content;

  const crumbs: Crumb[] = [
    { label: "notes", href: "/" },
    ...slug.slice(0, -1).map((segment, i) => {
      const href = "/" + slug.slice(0, i + 1).join("/");
      const ancestor = index.pages.find((p) => p.url === href);
      return { label: ancestor?.title ?? segment, href };
    }),
    { label: page.title },
  ];

  return (
    <article className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-8 py-12">
      <Breadcrumb items={crumbs} />
      <header className="flex flex-col gap-2 pb-2">
        <div className="flex items-center gap-3">
          {page.icon ? (
            <span className="text-[22px] leading-none">{page.icon}</span>
          ) : null}
          <h1 className="text-[22px] font-medium leading-tight text-[var(--text-primary)]">
            {page.title}
          </h1>
        </div>
        {page.updated ? (
          <p className="text-[11px] text-[var(--text-muted)]">
            updated {formatRelative(page.updated)}
          </p>
        ) : null}
      </header>
      <Editor pageId={page.id} initial={body.trimStart()} />
    </article>
  );
}

function formatRelative(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return iso;
  const diff = Date.now() - t;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}d ago`;
  return new Date(t).toISOString().slice(0, 10);
}
