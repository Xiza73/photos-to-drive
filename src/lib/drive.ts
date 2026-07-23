import { invoke } from "@tauri-apps/api/core";

export interface DriveFolder {
  id: string;
  name: string;
}

/** Login OAuth con Google; el token queda guardado en el core Rust. */
export function googleLogin(clientId: string, clientSecret: string): Promise<void> {
  return invoke("google_login", { clientId, clientSecret });
}

/** Lista carpetas de Drive (incluye compartidas). Requiere login previo. */
export function listFolders(): Promise<DriveFolder[]> {
  return invoke("drive_list_folders");
}

/** Crea una carpeta en Drive y devuelve su id. Requiere login previo. */
export function createFolder(name: string): Promise<DriveFolder> {
  return invoke("drive_create_folder", { name });
}
