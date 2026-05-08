"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { logEntryAction } from "@/server/actions/habits";
import { cn } from "@/lib/cn";

export function HabitCheckbox({
  habitId,
  dayKey,
  checked,
  color,
  size = "sm",
}: {
  habitId: string;
  dayKey: string;
  checked: boolean;
  color: string;
  size?: "sm" | "md";
}) {
  const [pending, start] = useTransition();
  const dim = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const onToggle = () =>
    start(async () => {
      await logEntryAction({ habitId, dayKey });
    });

  return (
    <button
      type="button"
      aria-label={checked ? "uncheck" : "check"}
      onClick={onToggle}
      disabled={pending}
      style={{
        background: checked ? color : "var(--bg-secondary)",
        borderColor: checked ? color : "var(--border-default)",
      }}
      className={cn(
        "flex items-center justify-center rounded-sm border transition-opacity",
        dim,
        pending && "opacity-50"
      )}
    >
      {checked ? (
        <Check
          className={cn(size === "md" ? "h-3 w-3" : "h-2.5 w-2.5")}
          strokeWidth={3}
          color="var(--bg-primary)"
        />
      ) : null}
    </button>
  );
}
