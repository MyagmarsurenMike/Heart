"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronRight, Plus } from "lucide-react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import type { PageNode } from "@/server/index/tree";
import { cn } from "@/lib/cn";
import {
  createPageAction,
  movePageAction,
  renamePageAction,
  reorderPageAction,
} from "@/server/actions/pages";
import { DeletePageDialog } from "./delete-page-dialog";

type RowKind = "nest" | "before" | "after";
type DropTarget =
  | { kind: "nest"; targetId: string }
  | { kind: "between"; parentId: string | null; beforeId: string | null; afterId: string | null }
  | { kind: "root" };

function dropId(kind: RowKind, id: string): string {
  return `${kind}:${id}`;
}
function rootDropId(): string {
  return "drop:root";
}
function parseDropId(raw: string): DropTarget | null {
  if (raw === rootDropId()) return { kind: "root" };
  const [kind, id] = raw.split(":");
  if (kind === "nest") return { kind: "nest", targetId: id };
  return null;
}

export function PageTree({ nodes }: { nodes: PageNode[] }) {
  const [pendingDelete, setPendingDelete] = useState<PageNode | null>(null);
  const [activeNode, setActiveNode] = useState<PageNode | null>(null);
  const [, start] = useTransition();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const flat = useMemo(() => flatten(nodes), [nodes]);
  const byId = useMemo(() => new Map(flat.map((f) => [f.node.id, f])), [flat]);

  const onDragStart = (e: DragStartEvent) => {
    const f = byId.get(String(e.active.id));
    if (f) setActiveNode(f.node);
  };

  const onDragEnd = (e: DragEndEvent) => {
    setActiveNode(null);
    if (!e.over) return;
    const activeId = String(e.active.id);
    const data = e.over.data.current as { target?: DropTarget } | undefined;
    const target = data?.target ?? parseDropId(String(e.over.id));
    if (!target) return;

    if (target.kind === "root") {
      start(() => {
        void movePageAction({ id: activeId, newParentId: null });
      });
      return;
    }
    if (target.kind === "nest") {
      if (target.targetId === activeId) return;
      start(() => {
        void movePageAction({
          id: activeId,
          newParentId: target.targetId,
        });
      });
      return;
    }
    if (target.kind === "between") {
      const sameParent = activeNodeParent(byId, activeId) === target.parentId;
      if (sameParent) {
        start(() => {
          void reorderPageAction({
            id: activeId,
            beforeId: target.beforeId,
            afterId: target.afterId,
          });
        });
      } else {
        start(async () => {
          await movePageAction({
            id: activeId,
            newParentId: target.parentId,
          });
          await reorderPageAction({
            id: activeId,
            beforeId: target.beforeId,
            afterId: target.afterId,
          });
        });
      }
    }
  };

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col gap-2 px-3 py-2">
        <p className="text-[12px] text-[var(--text-disabled)]">no pages yet</p>
        <NewRootPageButton />
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <RootDropZone />
      <ul className="flex flex-col gap-px">
        {nodes.map((n, i) => (
          <PageTreeBranch
            key={n.id}
            node={n}
            depth={0}
            indexInParent={i}
            siblings={nodes}
            parentId={null}
            onRequestDelete={setPendingDelete}
          />
        ))}
      </ul>
      <BetweenStrip
        id={dropId("after", "root")}
        target={{
          kind: "between",
          parentId: null,
          beforeId: nodes[nodes.length - 1]?.id ?? null,
          afterId: null,
        }}
        depth={0}
      />
      <div className="px-1 pt-2">
        <NewRootPageButton />
      </div>
      <DragOverlay dropAnimation={null}>
        {activeNode ? (
          <div className="flex h-7 items-center gap-1.5 rounded-sm border border-[var(--border-default)] bg-[var(--bg-elevated)] px-2 text-[12px] text-[var(--text-primary)]">
            {activeNode.icon ? <span>{activeNode.icon}</span> : null}
            <span>{activeNode.title}</span>
          </div>
        ) : null}
      </DragOverlay>
      {pendingDelete ? (
        <DeletePageDialog
          page={pendingDelete}
          onClose={() => setPendingDelete(null)}
        />
      ) : null}
    </DndContext>
  );
}

function flatten(
  nodes: PageNode[],
  depth = 0,
  parentId: string | null = null,
  out: { node: PageNode; depth: number; parentId: string | null }[] = []
) {
  for (const n of nodes) {
    out.push({ node: n, depth, parentId });
    if (n.children.length) flatten(n.children, depth + 1, n.id, out);
  }
  return out;
}

function activeNodeParent(
  byId: Map<string, { parentId: string | null }>,
  id: string
): string | null {
  return byId.get(id)?.parentId ?? null;
}

function RootDropZone() {
  const { setNodeRef, isOver } = useDroppable({ id: rootDropId() });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "mb-1 h-1.5 rounded-sm transition-colors",
        isOver && "bg-[var(--accent-muted)] outline outline-1 outline-[var(--accent)]"
      )}
    />
  );
}

function PageTreeBranch({
  node,
  depth,
  indexInParent,
  siblings,
  parentId,
  onRequestDelete,
}: {
  node: PageNode;
  depth: number;
  indexInParent: number;
  siblings: PageNode[];
  parentId: string | null;
  onRequestDelete: (n: PageNode) => void;
}) {
  const [open, setOpen] = useState(true);
  const isFirst = indexInParent === 0;

  return (
    <li>
      {isFirst ? (
        <BetweenStrip
          id={dropId("before", node.id)}
          target={{
            kind: "between",
            parentId,
            beforeId: null,
            afterId: node.id,
          }}
          depth={depth}
        />
      ) : null}
      <PageTreeItem
        node={node}
        depth={depth}
        open={open}
        setOpen={setOpen}
        onRequestDelete={onRequestDelete}
      />
      {node.children.length > 0 && open ? (
        <ul className="flex flex-col gap-px">
          {node.children.map((c, i) => (
            <PageTreeBranch
              key={c.id}
              node={c}
              depth={depth + 1}
              indexInParent={i}
              siblings={node.children}
              parentId={node.id}
              onRequestDelete={onRequestDelete}
            />
          ))}
        </ul>
      ) : null}
      <BetweenStrip
        id={dropId("after", node.id)}
        target={{
          kind: "between",
          parentId,
          beforeId: node.id,
          afterId: siblings[indexInParent + 1]?.id ?? null,
        }}
        depth={depth}
      />
    </li>
  );
}

function BetweenStrip({
  id,
  target,
  depth,
}: {
  id: string;
  target: DropTarget;
  depth: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { target } });
  return (
    <div
      ref={setNodeRef}
      data-target={target.kind}
      style={{ marginLeft: `${6 + depth * 16}px` }}
      className={cn(
        "h-1 rounded-sm transition-colors",
        isOver && "bg-[var(--accent)]"
      )}
    />
  );
}

function PageTreeItem({
  node,
  depth,
  open,
  setOpen,
  onRequestDelete,
}: {
  node: PageNode;
  depth: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  onRequestDelete: (n: PageNode) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active = pathname === node.url;
  const [renaming, setRenaming] = useState(false);
  const [pending, start] = useTransition();
  const hasChildren = node.children.length > 0;

  const drag = useDraggable({ id: node.id, disabled: renaming });
  const drop = useDroppable({ id: dropId("nest", node.id) });

  const setRefs = (el: HTMLDivElement | null) => {
    drag.setNodeRef(el);
    drop.setNodeRef(el);
  };

  const addSubpage = () =>
    start(async () => {
      setOpen(true);
      const r = await createPageAction({
        parentId: node.id,
        title: "Untitled",
      });
      router.push(r.url);
    });
  const addSibling = () =>
    start(async () => {
      const r = await createPageAction({
        parentId: node.parent_id,
        title: "Untitled",
      });
      router.push(r.url);
    });

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div
          ref={setRefs}
          {...drag.listeners}
          {...drag.attributes}
          className={cn(
            "group relative flex h-7 items-center gap-1 rounded-sm pr-1 text-[12px]",
            "text-[var(--text-secondary)] transition-colors",
            "hover:bg-[var(--bg-tertiary)]",
            active &&
              "bg-[var(--accent-muted)] text-[var(--text-primary)] before:absolute before:inset-y-0 before:left-0 before:w-[2px] before:bg-[var(--accent)]",
            drop.isOver &&
              "outline outline-1 outline-[var(--accent)] bg-[var(--accent-muted)]",
            drag.isDragging && "opacity-30",
            pending && "opacity-60"
          )}
          style={{ paddingLeft: `${6 + depth * 16}px` }}
          onDoubleClick={(e) => {
            e.preventDefault();
            setRenaming(true);
          }}
        >
          {hasChildren ? (
            <button
              type="button"
              aria-label={open ? "collapse" : "expand"}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setOpen(!open)}
              className="flex h-4 w-4 shrink-0 items-center justify-center text-[var(--text-disabled)] hover:text-[var(--text-secondary)]"
            >
              <ChevronRight
                className={cn(
                  "h-3 w-3 transition-transform duration-150",
                  open && "rotate-90"
                )}
                strokeWidth={1.5}
              />
            </button>
          ) : (
            <span className="h-4 w-4 shrink-0" />
          )}
          {renaming ? (
            <RenameField
              id={node.id}
              initial={node.title}
              onDone={() => setRenaming(false)}
            />
          ) : (
            <Link
              href={node.url}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex min-w-0 flex-1 items-center gap-1.5 truncate"
            >
              {node.icon ? (
                <span className="text-[12px] leading-none">{node.icon}</span>
              ) : null}
              <span className="truncate">{node.title}</span>
            </Link>
          )}
          {!renaming ? (
            <button
              type="button"
              aria-label="add subpage"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                addSubpage();
              }}
              disabled={pending}
              className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-sm text-[var(--text-disabled)] opacity-0 transition-opacity hover:bg-[var(--bg-elevated)] hover:text-[var(--text-secondary)] group-hover:opacity-100 focus:opacity-100"
            >
              <Plus className="h-3 w-3" strokeWidth={1.5} />
            </button>
          ) : null}
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content
          className={cn(
            "z-50 min-w-[180px] overflow-hidden rounded border border-[var(--border-default)]",
            "bg-[var(--bg-elevated)] p-1 text-[12px] text-[var(--text-secondary)]"
          )}
        >
          <MenuItem onSelect={() => setRenaming(true)}>Rename</MenuItem>
          <MenuItem onSelect={addSubpage}>Add subpage</MenuItem>
          <MenuItem onSelect={addSibling}>Add sibling</MenuItem>
          <ContextMenu.Separator className="my-1 h-px bg-[var(--border-subtle)]" />
          <MenuItem destructive onSelect={() => onRequestDelete(node)}>
            Delete
          </MenuItem>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

function MenuItem({
  children,
  onSelect,
  destructive,
}: {
  children: React.ReactNode;
  onSelect: () => void;
  destructive?: boolean;
}) {
  return (
    <ContextMenu.Item
      onSelect={onSelect}
      className={cn(
        "flex h-7 cursor-default items-center rounded-sm px-2 outline-none",
        "data-[highlighted]:bg-[var(--bg-tertiary)] data-[highlighted]:text-[var(--text-primary)]",
        destructive &&
          "text-[var(--danger)] data-[highlighted]:text-[var(--danger)]"
      )}
    >
      {children}
    </ContextMenu.Item>
  );
}

function NewRootPageButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await createPageAction({
            parentId: null,
            title: "Untitled",
          });
          router.push(r.url);
        })
      }
      className="flex h-7 w-full items-center gap-1.5 rounded-sm px-2 text-[12px] text-[var(--text-tertiary)] transition-colors hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-secondary)] disabled:opacity-50"
    >
      <Plus className="h-3 w-3" strokeWidth={1.5} />
      new page
    </button>
  );
}

function RenameField({
  id,
  initial,
  onDone,
}: {
  id: string;
  initial: string;
  onDone: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    const trimmed = value.trim();
    if (!trimmed || trimmed === initial) {
      onDone();
      return;
    }
    start(async () => {
      try {
        await renamePageAction(id, trimmed);
      } finally {
        onDone();
      }
    });
  };

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      disabled={pending}
      onBlur={commit}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          onDone();
        }
      }}
      className="min-w-0 flex-1 rounded-sm border border-[var(--accent)] bg-[var(--bg-secondary)] px-1 text-[12px] text-[var(--text-primary)] outline-none"
    />
  );
}
