import { tauriPlatform } from "./tauri";
import { webPlatform, preloadGis } from "./web";

/** Detecta si corremos dentro de Tauri (desktop) o en un navegador (web). */
const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export const platform = isTauri ? tauriPlatform : webPlatform;

// En web, precargamos Google Identity Services desde el arranque.
if (!isTauri) preloadGis();

export {
  FOLDER_SOURCES,
  type FolderSource,
  type DriveFolder,
  type SelectedPhoto,
} from "./types";
