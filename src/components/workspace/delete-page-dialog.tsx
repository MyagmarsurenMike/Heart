"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PageNode } from "@/server/index/tree";
import { deletePageAction } from "@/server/actions/pages";
import { cn } from "@/lib/cn";

export function DeletePageDialog({
  page,
  onClose,
}: {
  page: PageNode;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const descendants = countDescendants(page);

  const onConfirm = () =>
    start(async () => {
      await deletePageAction(page.id);
      onClose();
      router.push("/");
    });

  return (
    <Dialog.Root open onOpenChange={(o) => (o ? null : onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[min(440px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2",
            "rounded border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5"
          )}
        >
          <Dialog.Title className="text-[14px] font-medium text-[var(--text-primary)]">
            Delete this page?
          </Dialog.Title>
          <Dialog.Description className="mt-2 text-[12px] leading-relaxed text-[var(--text-tertiary)]">
            {descendants > 0
              ? `“${page.title}” and ${descendants} subpage${descendants === 1 ? "" : "s"} will be moved to .hearth/trash/. You can recover them by hand.`
              : `“${page.title}” will be moved to .hearth/trash/. You can recover it by hand.`}
          </Dialog.Description>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="h-8 rounded-sm border border-[var(--border-default)] bg-transparent px-3 text-[12px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              className="h-8 rounded-sm border border-[var(--danger)] bg-[var(--danger)] px-3 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Deleting…" : "Delete"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function countDescendants(node: PageNode): number {
  let total = 0;
  for (const c of node.children) total += 1 + countDescendants(c);
  return total;
}
