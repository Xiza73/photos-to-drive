/** Una foto de entrada; de su nombre original sacamos el tipo (extensión). */
export interface PhotoInput {
  originalName: string;
}

/** Resultado del renombrado de una foto. */
export interface RenamedPhoto {
  originalName: string;
  newName: string;
  order: number;
}

/** Opciones del renombrado de un lote. */
export interface RenameOptions {
  baseName: string;
  photos: PhotoInput[];
  startOrder?: number;
}

/** Extrae la extensión en minúsculas. "IMG.JPG" -> "jpg". Sin extensión -> "". */
function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  // dot <= 0 descarta "sin punto" y también archivos ocultos tipo ".env".
  if (dot <= 0 || dot === fileName.length - 1) return "";
  return fileName.slice(dot + 1).toLowerCase();
}

/**
 * Renombra un lote como `<baseName> (<orden>).<tipo>` — ej. "boda (1).jpg".
 * El orden respeta el orden del array y arranca en startOrder (default 1).
 * ponytail: sin padding en el orden; si Drive necesita ordenar bien, se agrega después.
 */
export function renamePhotos({
  baseName,
  photos,
  startOrder = 1,
}: RenameOptions): RenamedPhoto[] {
  const trimmed = baseName.trim();
  if (!trimmed) throw new Error("baseName no puede estar vacío");
  if (photos.length === 0) throw new Error("no hay fotos para renombrar");

  return photos.map((photo, index) => {
    const order = startOrder + index;
    const ext = extensionOf(photo.originalName);
    const newName = ext
      ? `${trimmed} (${order}).${ext}`
      : `${trimmed} (${order})`;
    return { originalName: photo.originalName, newName, order };
  });
}
