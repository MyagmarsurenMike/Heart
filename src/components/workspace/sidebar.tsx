import Link from "next/link";
import { Home, ListChecks } from "lucide-react";
import { getIndex } from "@/server/index/loader";
import { buildTree } from "@/server/index/tree";
import { PageTree } from "./page-tree";
import { SidebarLink } from "./sidebar-link";
import { CommandPaletteTrigger } from "./command-palette";

export async function Sidebar() {
  const index = await getIndex();
  const tree = buildTree(index);

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-primary)]">
      <div className="flex h-12 items-center px-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-[13px] font-medium text-[var(--text-primary)]"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]" />
          hearth
        </Link>
      </div>
      <div className="px-3 pb-2">
        <CommandPaletteTrigger />
      </div>
      <nav className="flex flex-col gap-px px-1">
        <SidebarLink
          href="/"
          icon={<Home className="h-3.5 w-3.5" strokeWidth={1.5} />}
          label="today"
        />
        <SidebarLink
          href="/habits"
          icon={<ListChecks className="h-3.5 w-3.5" strokeWidth={1.5} />}
          label="habits"
        />
      </nav>
      <div className="px-3 pt-3 pb-1 tiny-label">workspace</div>
      <nav className="flex-1 overflow-y-auto px-1 pb-4">
        <PageTree nodes={tree} />
      </nav>
    </aside>
  );
}
