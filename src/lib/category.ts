/** Port de category_from_code() de scripts/migrate_to_supabase.py — mismo
 * patrón <PREFIJO>_HU<número>_ verificado contra los 28 códigos reales. */
const CATEGORY_RE = /^([A-Za-zÁÉÍÓÚáéíóúñÑ]+)_HU\d+_/;

export function categoryFromCode(code: string): string | null {
  const m = CATEGORY_RE.exec(code);
  return m ? m[1].toUpperCase() : null;
}
