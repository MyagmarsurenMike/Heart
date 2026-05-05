import type { HearthIndex, IndexedPage } from "./types";

export type PageNode = IndexedPage & { children: PageNode[] };

export function buildTree(index: HearthIndex): PageNode[] {
  const byId = new Map<string, PageNode>();
  for (const p of index.pages) byId.set(p.id, { ...p, children: [] });
  const roots: PageNode[] = [];
  for (const node of byId.values()) {
    const parent = node.parent_id ? byId.get(node.parent_id) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sortFn = (a: PageNode, b: PageNode) => {
    if (a.position !== b.position) return a.position - b.position;
    return a.title.localeCompare(b.title);
  };
  const sortRec = (nodes: PageNode[]) => {
    nodes.sort(sortFn);
    for (const n of nodes) sortRec(n.children);
  };
  sortRec(roots);
  return roots;
}
