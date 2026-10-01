/** URL-safe slug from a display name: lowercase, non-alphanumerics collapse to single dashes. */
export function createSlug(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}
