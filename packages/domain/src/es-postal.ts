/**
 * Códigos postales España: los 2 primeros dígitos = provincia.
 * Sirve para detectar direcciones, no para tumbar todo SKU de 5 dígitos
 * (p.ej. 10031 en picking lists coincide con Cáceres).
 */

export type EsProvince = {
  /** Prefijo CP "01"…"52" */
  prefix: string;
  province: string;
  community: string;
};

/** Catálogo oficial de prefijos provinciales → comunidad autónoma */
export const ES_POSTAL_PROVINCES: EsProvince[] = [
  { prefix: "01", province: "Álava", community: "País Vasco" },
  { prefix: "02", province: "Albacete", community: "Castilla-La Mancha" },
  { prefix: "03", province: "Alicante", community: "Comunidad Valenciana" },
  { prefix: "04", province: "Almería", community: "Andalucía" },
  { prefix: "05", province: "Ávila", community: "Castilla y León" },
  { prefix: "06", province: "Badajoz", community: "Extremadura" },
  { prefix: "07", province: "Illes Balears", community: "Illes Balears" },
  { prefix: "08", province: "Barcelona", community: "Cataluña" },
  { prefix: "09", province: "Burgos", community: "Castilla y León" },
  { prefix: "10", province: "Cáceres", community: "Extremadura" },
  { prefix: "11", province: "Cádiz", community: "Andalucía" },
  { prefix: "12", province: "Castellón", community: "Comunidad Valenciana" },
  { prefix: "13", province: "Ciudad Real", community: "Castilla-La Mancha" },
  { prefix: "14", province: "Córdoba", community: "Andalucía" },
  { prefix: "15", province: "A Coruña", community: "Galicia" },
  { prefix: "16", province: "Cuenca", community: "Castilla-La Mancha" },
  { prefix: "17", province: "Girona", community: "Cataluña" },
  { prefix: "18", province: "Granada", community: "Andalucía" },
  { prefix: "19", province: "Guadalajara", community: "Castilla-La Mancha" },
  { prefix: "20", province: "Gipuzkoa", community: "País Vasco" },
  { prefix: "21", province: "Huelva", community: "Andalucía" },
  { prefix: "22", province: "Huesca", community: "Aragón" },
  { prefix: "23", province: "Jaén", community: "Andalucía" },
  { prefix: "24", province: "León", community: "Castilla y León" },
  { prefix: "25", province: "Lleida", community: "Cataluña" },
  { prefix: "26", province: "La Rioja", community: "La Rioja" },
  { prefix: "27", province: "Lugo", community: "Galicia" },
  { prefix: "28", province: "Madrid", community: "Comunidad de Madrid" },
  { prefix: "29", province: "Málaga", community: "Andalucía" },
  { prefix: "30", province: "Murcia", community: "Región de Murcia" },
  { prefix: "31", province: "Navarra", community: "Navarra" },
  { prefix: "32", province: "Ourense", community: "Galicia" },
  { prefix: "33", province: "Asturias", community: "Principado de Asturias" },
  { prefix: "34", province: "Palencia", community: "Castilla y León" },
  { prefix: "35", province: "Las Palmas", community: "Canarias" },
  { prefix: "36", province: "Pontevedra", community: "Galicia" },
  { prefix: "37", province: "Salamanca", community: "Castilla y León" },
  { prefix: "38", province: "Santa Cruz de Tenerife", community: "Canarias" },
  { prefix: "39", province: "Cantabria", community: "Cantabria" },
  { prefix: "40", province: "Segovia", community: "Castilla y León" },
  { prefix: "41", province: "Sevilla", community: "Andalucía" },
  { prefix: "42", province: "Soria", community: "Castilla y León" },
  { prefix: "43", province: "Tarragona", community: "Cataluña" },
  { prefix: "44", province: "Teruel", community: "Aragón" },
  { prefix: "45", province: "Toledo", community: "Castilla-La Mancha" },
  { prefix: "46", province: "Valencia", community: "Comunidad Valenciana" },
  { prefix: "47", province: "Valladolid", community: "Castilla y León" },
  { prefix: "48", province: "Bizkaia", community: "País Vasco" },
  { prefix: "49", province: "Zamora", community: "Castilla y León" },
  { prefix: "50", province: "Zaragoza", community: "Aragón" },
  { prefix: "51", province: "Ceuta", community: "Ceuta" },
  { prefix: "52", province: "Melilla", community: "Melilla" },
];

const BY_PREFIX = new Map(ES_POSTAL_PROVINCES.map((p) => [p.prefix, p]));

/** ¿Es un CP español válido (5 dígitos, prefijo 01–52)? */
export function isSpanishPostalCode(code: string): boolean {
  const t = (code || "").trim();
  if (!/^\d{5}$/.test(t)) return false;
  return BY_PREFIX.has(t.slice(0, 2));
}

export function lookupSpanishPostal(code: string): EsProvince | null {
  const t = (code || "").trim();
  if (!/^\d{5}$/.test(t)) return null;
  return BY_PREFIX.get(t.slice(0, 2)) ?? null;
}

/**
 * Normaliza para comparar nombres de lugar (sin acentos, lower).
 */
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * El nombre menciona la provincia o la CCAA del CP → casi seguro dirección.
 * Estructural + catálogo cerrado (no lista infinita de pueblos).
 */
export function postalMatchesPlaceName(code: string, placeName: string): boolean {
  const info = lookupSpanishPostal(code);
  if (!info) return false;
  const place = fold(placeName);
  if (!place) return false;
  const prov = fold(info.province);
  const com = fold(info.community);
  if (prov && place.includes(prov)) return true;
  if (com && place.includes(com)) return true;
  // País + CP español válido
  if (/\bespana\b|\bspain\b/.test(place)) return true;
  return false;
}
