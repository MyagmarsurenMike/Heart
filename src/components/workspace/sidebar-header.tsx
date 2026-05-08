"use client";

import Link from "next/link";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/cn";

export function SidebarHeader() {
  const onCollapse = () => {
    const evt = new KeyboardEvent("keydown", {
      key: "\\",
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(evt);
  };

  return (
    <div className="flex h-12 items-center justify-between gap-2 px-3">
      <Link
        href="/"
        className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-glow)] rounded-sm"
      >
        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
        <span className="sidebar-label truncate">hearth</span>
      </Link>
      <button
        type="button"
        aria-label="collapse sidebar"
        title="Toggle sidebar (⌘\\)"
        onClick={onCollapse}
        className={cn(
          "sidebar-label flex h-6 w-6 shrink-0 items-center justify-center rounded-sm",
          "text-[var(--text-disabled)] transition-colors duration-150",
          "hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-glow)]"
        )}
      >
        <PanelLeft className="h-3 w-3" strokeWidth={1.5} />
      </button>
    </div>
  );
}
