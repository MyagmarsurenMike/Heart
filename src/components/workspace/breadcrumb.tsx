import Link from "next/link";

export type Crumb = { label: string; href?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 ? <span aria-hidden>/</span> : null}
          {c.href ? (
            <Link
              href={c.href}
              className="hover:text-[var(--text-tertiary)] transition-colors"
            >
              {c.label}
            </Link>
          ) : (
            <span>{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
