"use client";

import { useTransition } from "react";
import { archiveHabitAction } from "@/server/actions/habits";

export function ArchiveButton({
  id,
  archived,
}: {
  id: string;
  archived: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      onClick={() =>
        start(async () => {
          await archiveHabitAction(id, !archived);
        })
      }
      disabled={pending}
      className="h-7 rounded-sm border border-[var(--border-default)] bg-transparent px-2 text-[11px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)] disabled:opacity-50"
    >
      {archived ? "unarchive" : "archive"}
    </button>
  );
}
