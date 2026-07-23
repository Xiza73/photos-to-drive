import { invoke } from "@tauri-apps/api/core";

export interface DriveFolder {
  id: string;
  name: string;
}

export const FOLDER_SOURCES = {
  MY_DRIVE: "my_drive",
  SHARED_WITH_ME: "shared_with_me",
  SHARED_DRIVES: "shared_drives",
} as const;

export type FolderSource = (typeof FOLDER_SOURCES)[keyof typeof FOLDER_SOURCES];

/** Login OAuth con Google; el token queda guardado en el core Rust. */
export function googleLogin(clientId: string, clientSecret: string): Promise<void> {
  return invoke("google_login", { clientId, clientSecret });
}

/**
 * Lista subcarpetas de `parentId`, o el nivel superior del `source`
 * (Mi unidad / Compartido conmigo) si no se pasa `parentId`.
 */
export function listFolders(source: FolderSource, parentId?: string): Promise<DriveFolder[]> {
  return invoke("drive_list_folders", { parentId: parentId ?? null, source });
}

/** Lista las unidades compartidas del usuario. */
export function listSharedDrives(): Promise<DriveFolder[]> {
  return invoke("drive_list_shared_drives");
}

/** Crea una carpeta (dentro de `parentId` si se da) y devuelve su id. */
export function createFolder(name: string, parentId?: string): Promise<DriveFolder> {
  return invoke("drive_create_folder", { name, parentId: parentId ?? null });
}

/** Sube una foto a la carpeta dada con el nombre renombrado. Devuelve el id creado. */
export function uploadFile(folderId: string, path: string, name: string): Promise<string> {
  return invoke("drive_upload_file", { folderId, path, name });
}
