"use client";

import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "hearth-sidebar-collapsed";

// External store backed by localStorage so the initial render reads the
// stored value via useSyncExternalStore — no setState-in-effect needed.
const collapsedStore = (() => {
  const listeners = new Set<() => void>();
  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  };
  const getSnapshot = () => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  };
  const set = (next: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {}
    for (const l of listeners) l();
  };
  return { subscribe, getSnapshot, set };
})();

export function WorkspaceShell({
  sidebar,
  status,
  children,
}: {
  sidebar: ReactNode;
  status: ReactNode;
  children: ReactNode;
}) {
  const collapsed = useSyncExternalStore(
    collapsedStore.subscribe,
    collapsedStore.getSnapshot,
    () => false
  );
  // Suppress the width transition on the first paint so a stored
  // "collapsed" preference doesn't animate from 240→56 on every reload.
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        collapsedStore.set(!collapsedStore.getSnapshot());
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-screen flex-col">
      <div className="relative flex min-h-0 flex-1">
        <aside
          data-collapsed={collapsed || undefined}
          className={cn(
            "group/sidebar relative shrink-0 overflow-hidden border-r border-[var(--border-subtle)] bg-[var(--bg-primary)]",
            "w-[240px] data-[collapsed]:w-[56px]",
            animate && "transition-[width] duration-200 ease-out"
          )}
        >
          {sidebar}
        </aside>
        <main className="relative flex min-w-0 flex-1 flex-col overflow-y-auto bg-[var(--bg-primary)]">
          <FloatingSidebarToggle
            collapsed={collapsed}
            onToggle={() => collapsedStore.set(!collapsed)}
          />
          {children}
        </main>
      </div>
      {status}
    </div>
  );
}

function FloatingSidebarToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  if (!collapsed) return null;
  return (
    <button
      type="button"
      aria-label="expand sidebar"
      title="Expand sidebar (⌘\\)"
      onClick={onToggle}
      className={cn(
        "fixed left-[64px] top-3 z-40 flex h-7 w-7 items-center justify-center",
        "rounded-sm border border-[var(--border-default)] bg-[var(--bg-elevated)]",
        "text-[var(--text-tertiary)] transition-colors duration-150 hover:text-[var(--text-primary)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-glow)]"
      )}
    >
      <PanelLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
    </button>
  );
}
