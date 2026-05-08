"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SidebarLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  const pathname = usePathname();
  const active =
    pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={cn(
        "relative flex h-7 items-center gap-2 rounded-sm px-2 text-[12px] transition-colors",
        active
          ? "bg-[var(--accent-muted)] text-[var(--text-primary)] before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-[var(--accent)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
      )}
    >
      {icon}
      {label}
    </Link>
  );
}
