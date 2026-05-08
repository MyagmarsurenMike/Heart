"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useState, useTransition } from "react";
import {
  createHabitAction,
  updateHabitAction,
} from "@/server/actions/habits";
import { cn } from "@/lib/cn";

const PRESET_COLORS = [
  "#06B6D4",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#F472B6",
];

type FormProps = {
  initial?: {
    id: string;
    name: string;
    color: string;
    frequency: "daily" | "weekly";
    target_per_period: number;
  };
  onClose: () => void;
};

export function HabitFormDialog(props: FormProps) {
  const [name, setName] = useState(props.initial?.name ?? "");
  const [color, setColor] = useState(props.initial?.color ?? PRESET_COLORS[0]);
  const [pending, start] = useTransition();

  const onSubmit = () =>
    start(async () => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (props.initial) {
        await updateHabitAction(props.initial.id, { name: trimmed, color });
      } else {
        await createHabitAction({ name: trimmed, color });
      }
      props.onClose();
    });

  return (
    <Dialog.Root open onOpenChange={(o) => (o ? null : props.onClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[460px] -translate-x-1/2 -translate-y-1/2",
            "rounded border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5"
          )}
        >
          <Dialog.Title className="text-[14px] font-medium text-[var(--text-primary)]">
            {props.initial ? "Edit habit" : "New habit"}
          </Dialog.Title>
          <div className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="tiny-label">name</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Read"
                className="h-8 rounded-sm border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSubmit();
                  } else if (e.key === "Escape") {
                    props.onClose();
                  }
                }}
              />
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="tiny-label">color</span>
              <div className="flex gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    aria-label={`color ${c}`}
                    onClick={() => setColor(c)}
                    style={{ background: c }}
                    className={cn(
                      "h-6 w-6 rounded-sm border transition-transform",
                      color === c
                        ? "border-[var(--text-primary)] scale-110"
                        : "border-[var(--border-default)]"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={props.onClose}
              disabled={pending}
              className="h-8 rounded-sm border border-[var(--border-default)] bg-transparent px-3 text-[12px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={pending || name.trim().length === 0}
              className="h-8 rounded-sm bg-[var(--accent)] px-3 text-[12px] font-medium text-[var(--bg-primary)] transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {pending ? "Saving…" : props.initial ? "Save" : "Create"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function NewHabitButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-8 rounded-sm bg-[var(--accent)] px-3 text-[12px] font-medium text-[var(--bg-primary)] transition-opacity hover:opacity-90"
      >
        + new habit
      </button>
      {open ? <HabitFormDialog onClose={() => setOpen(false)} /> : null}
    </>
  );
}

export function EditHabitButton(props: { habit: FormProps["initial"] }) {
  const [open, setOpen] = useState(false);
  if (!props.habit) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-7 rounded-sm border border-[var(--border-default)] bg-transparent px-2 text-[11px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-tertiary)]"
      >
        edit
      </button>
      {open ? (
        <HabitFormDialog initial={props.habit} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
