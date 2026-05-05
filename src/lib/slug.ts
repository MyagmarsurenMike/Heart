import slugify from "slugify";

// Slugs are always lowercase. macOS is case-insensitive but Linux isn't —
// lowercasing here keeps the storage folder portable across both.
export function makeSlug(input: string): string {
  const s = slugify(input, { lower: true, strict: true, trim: true });
  return s || "untitled";
}
