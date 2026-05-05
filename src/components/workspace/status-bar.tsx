import { getStoragePaths } from "@/server/storage/paths";

export function StatusBar() {
  const { root } = getStoragePaths();
  return (
    <div className="flex h-6 shrink-0 items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-[10px] text-[var(--text-muted)]">
      <span className="truncate" title={root}>
        storage · {root}
      </span>
      <span>phase 0</span>
    </div>
  );
}
