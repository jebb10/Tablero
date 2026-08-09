/** Port de slugify() de scripts/migrate_to_supabase.py — el orden importa:
 * toLowerCase() antes de normalize("NFD"), igual que el Python. */
const DIACRITICOS = new RegExp("[\\u0300-\\u036f]", "g");

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(DIACRITICOS, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
