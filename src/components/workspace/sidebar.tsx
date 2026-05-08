import { Home, ListChecks } from "lucide-react";
import { getIndex } from "@/server/index/loader";
import { buildTree } from "@/server/index/tree";
import { PageTree } from "./page-tree";
import { SidebarLink } from "./sidebar-link";
import { CommandPaletteTrigger } from "./command-palette";
import { SidebarHeader } from "./sidebar-header";

export async function Sidebar() {
  const index = await getIndex();
  const tree = buildTree(index);

  return (
    <div className="flex h-full w-[240px] flex-col">
      <SidebarHeader />
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
      <div className="sidebar-label px-3 pt-3 pb-1 tiny-label">workspace</div>
      <nav className="sidebar-tree flex-1 overflow-y-auto px-1 pb-4">
        <PageTree nodes={tree} />
      </nav>
    </div>
  );
}
