// Suppress SSE-driven router refreshes that race with the editor's own save.
// After the editor writes a file, chokidar fires within ~100ms and would
// trigger router.refresh() — which would replace the editor's `initial`
// prop with the version we just wrote, possibly mid-keystroke. Two-second
// cooldown matches PLAN.md ("a 2-second cooldown passes").

let lastSelfSaveAt = 0;
const COOLDOWN_MS = 2_000;

export function markSelfSaved(): void {
  lastSelfSaveAt = Date.now();
}

export function isInSelfSaveCooldown(): boolean {
  return Date.now() - lastSelfSaveAt < COOLDOWN_MS;
}
