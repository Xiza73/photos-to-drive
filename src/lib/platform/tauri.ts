import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { readFile } from "@tauri-apps/plugin-fs";
import { basename } from "../paths";
import type { Platform, SelectedPhoto, DriveFolder, FolderSource } from "./types";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif"];

function mimeForName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    default:
      return "image/jpeg";
  }
}

/** Implementación desktop: comandos Rust + plugins dialog/fs. */
export const tauriPlatform: Platform = {
  async selectPhotos() {
    const selection = await open({
      multiple: true,
      filters: [{ name: "Imágenes", extensions: IMAGE_EXTENSIONS }],
    });
    if (!selection) return [];
    const paths = Array.isArray(selection) ? selection : [selection];
    return paths.map((path) => ({ id: path, originalName: basename(path), path }));
  },

  async thumbnailUrl(photo) {
    if (!photo.path) return null;
    try {
      const bytes = await readFile(photo.path);
      return URL.createObjectURL(new Blob([bytes], { type: mimeForName(photo.originalName) }));
    } catch {
      return null;
    }
  },

  async connect() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Faltan VITE_GOOGLE_CLIENT_ID / VITE_GOOGLE_CLIENT_SECRET en .env.");
    }
    await invoke("google_login", { clientId, clientSecret });
  },

  listFolders(source: FolderSource, parentId?: string): Promise<DriveFolder[]> {
    return invoke("drive_list_folders", { parentId: parentId ?? null, source });
  },

  listSharedDrives(): Promise<DriveFolder[]> {
    return invoke("drive_list_shared_drives");
  },

  createFolder(name: string, parentId?: string): Promise<DriveFolder> {
    return invoke("drive_create_folder", { name, parentId: parentId ?? null });
  },

  async uploadPhoto(folderId, photo, newName) {
    if (!photo.path) throw new Error("foto sin ruta");
    await invoke("drive_upload_file", { folderId, path: photo.path, name: newName });
  },
};
