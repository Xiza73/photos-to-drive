/** Último segmento de una ruta, soporta separadores `/` y `\`. "C:\\a\\b.jpg" -> "b.jpg". */
export function basename(path: string): string {
  const normalized = path.replace(/\\/g, "/");
  return normalized.slice(normalized.lastIndexOf("/") + 1);
}
