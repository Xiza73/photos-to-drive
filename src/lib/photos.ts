import { open } from "@tauri-apps/plugin-dialog";
import { basename } from "./paths";

export interface SelectedPhoto {
  path: string;
  originalName: string;
}

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"];

/** Abre el diálogo del sistema para elegir varias imágenes. */
export async function selectPhotos(): Promise<SelectedPhoto[]> {
  const selection = await open({
    multiple: true,
    filters: [{ name: "Imágenes", extensions: IMAGE_EXTENSIONS }],
  });
  if (!selection) return [];
  const paths = Array.isArray(selection) ? selection : [selection];
  return paths.map((path) => ({ path, originalName: basename(path) }));
}
