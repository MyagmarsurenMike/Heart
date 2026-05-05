"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import type { PageNode } from "@/server/index/tree";
import { cn } from "@/lib/cn";

export function PageTree({ nodes }: { nodes: PageNode[] }) {
  if (nodes.length === 0) {
    return (
      <p className="px-3 py-2 text-[12px] text-[var(--text-disabled)]">
        no pages yet
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-px">
      {nodes.map((n) => (
        <PageTreeItem key={n.id} node={n} depth={0} />
      ))}
    </ul>
  );
}

function PageTreeItem({ node, depth }: { node: PageNode; depth: number }) {
  const pathname = usePathname();
  const active = pathname === node.url;
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;

  return (
    <li>
      <div
        className={cn(
          "group relative flex h-7 items-center gap-1 rounded-sm pr-2 text-[12px]",
          "text-[var(--text-secondary)] transition-colors",
          "hover:bg-[var(--bg-tertiary)]",
          active &&
            "bg-[var(--accent-muted)] text-[var(--text-primary)] before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-[var(--accent)]"
        )}
        style={{ paddingLeft: `${6 + depth * 16}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={open ? "collapse" : "expand"}
            onClick={() => setOpen((v) => !v)}
            className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--text-disabled)] hover:text-[var(--text-secondary)]"
          >
            <ChevronRight
              className={cn(
                "h-3 w-3 transition-transform duration-150",
                open && "rotate-90"
              )}
              strokeWidth={1.5}
            />
          </button>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}
        <Link
          href={node.url}
          className="flex min-w-0 flex-1 items-center gap-1.5 truncate"
        >
          {node.icon ? (
            <span className="text-[12px] leading-none">{node.icon}</span>
          ) : null}
          <span className="truncate">{node.title}</span>
        </Link>
      </div>
      {hasChildren && open ? (
        <ul className="flex flex-col gap-px">
          {node.children.map((child) => (
            <PageTreeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}
