import { getStoragePaths } from "@/server/storage/paths";

export function StatusBar() {
  const { root } = getStoragePaths();
  // Show only the trailing few segments on narrow screens; full path on hover.
  const tail = root.split("/").slice(-3).join("/");
  return (
    <div className="flex h-6 shrink-0 items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-[10px] text-[var(--text-muted)]">
      <span className="min-w-0 truncate" title={root}>
        <span className="hidden sm:inline">storage · {root}</span>
        <span className="sm:hidden">…/{tail}</span>
      </span>
      <span className="shrink-0">phase 4</span>
    </div>
  );
}
