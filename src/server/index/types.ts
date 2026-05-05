export type IndexedPage = {
  id: string;
  title: string;
  icon?: string;
  slug: string;
  parent_id: string | null;
  parent_slug: string | null;
  path: string; // absolute index.md path
  url: string; // app route (e.g. /welcome or /projects/his-web)
  position: number;
  updated: string | null;
  mtime: number;
};

export type HearthIndex = {
  schema_version: 1;
  built_at: string;
  pages: IndexedPage[];
};
