import { promises as fs } from "node:fs";
import { dirname } from "node:path";

// Atomic write: tmp file + fsync + rename. Used for every JSON/markdown write
// in the storage layer so a crash mid-write never corrupts a file.
// PLAN.md "Atomic writes are not optional".
export async function safeWrite(path: string, data: string): Promise<void> {
  await fs.mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
  const handle = await fs.open(tmp, "w");
  try {
    await handle.writeFile(data, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(tmp, path);
}
