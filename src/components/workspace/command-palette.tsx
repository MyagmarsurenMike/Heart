"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

export function CommandPaletteTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-7 w-full items-center gap-2 rounded-sm border border-[var(--border-default)]",
          "bg-[var(--bg-secondary)] px-2 text-[12px] text-[var(--text-tertiary)]",
          "transition-colors hover:bg-[var(--bg-tertiary)]"
        )}
      >
        <Search className="h-3 w-3" strokeWidth={1.5} />
        <span className="flex-1 text-left">search</span>
        <kbd className="text-[10px] text-[var(--text-disabled)]">⌘K</kbd>
      </button>
      {open ? <CommandPalette onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function CommandPalette({ onClose }: { onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[15vh]"
      onClick={onClose}
    >
      <div
        className={cn(
          "w-full max-w-[560px] overflow-hidden rounded border border-[var(--border-default)]",
          "bg-[var(--bg-elevated)]"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-3 py-2">
          <Search className="h-3.5 w-3.5 text-[var(--text-tertiary)]" strokeWidth={1.5} />
          <input
            autoFocus
            placeholder="search…"
            className="flex-1 bg-transparent text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-disabled)]"
          />
          <kbd className="text-[10px] text-[var(--text-disabled)]">esc</kbd>
        </div>
        <div className="px-3 py-6 text-center text-[12px] text-[var(--text-disabled)]">
          search lands in phase 7
        </div>
      </div>
    </div>
  );
}
