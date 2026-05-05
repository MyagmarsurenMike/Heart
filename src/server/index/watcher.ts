import chokidar, { type FSWatcher } from "chokidar";
import { getStoragePaths } from "@/server/storage/paths";

type Listener = (event: { kind: "change"; ts: number }) => void;

const subs = new Set<Listener>();
let watcher: FSWatcher | null = null;
let debounce: NodeJS.Timeout | null = null;

function broadcast() {
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => {
    debounce = null;
    const event = { kind: "change" as const, ts: Date.now() };
    for (const s of subs) {
      try {
        s(event);
      } catch {
        // dead subscriber — pruned via removeListener on disconnect
      }
    }
  }, 200);
}

export function notifyStorageChange(): void {
  broadcast();
}

function ensureWatcher(): FSWatcher {
  if (watcher) return watcher;
  const { notes } = getStoragePaths();
  watcher = chokidar.watch(notes, {
    ignoreInitial: true,
    ignored: (path: string) => {
      const base = path.split(/[\\/]/).pop() ?? "";
      if (base.startsWith(".")) return true;
      if (base.endsWith(".tmp") || base.endsWith(".swp")) return true;
      return false;
    },
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
  });
  watcher.on("all", () => broadcast());
  watcher.on("error", () => {
    // chokidar surfaces transient EACCES/ENOENT during dir moves; ignore.
  });
  return watcher;
}

export function subscribeToStorage(listener: Listener): () => void {
  ensureWatcher();
  subs.add(listener);
  return () => {
    subs.delete(listener);
  };
}
