export interface DriveFolder {
  id: string;
  name: string;
  /** Si el usuario puede crear/subir dentro (Drive: capabilities.canAddChildren). */
  writable: boolean;
}

export const FOLDER_SOURCES = {
  MY_DRIVE: "my_drive",
  SHARED_WITH_ME: "shared_with_me",
  SHARED_DRIVES: "shared_drives",
} as const;

export type FolderSource = (typeof FOLDER_SOURCES)[keyof typeof FOLDER_SOURCES];

/** Una foto seleccionada. El handle es opaco para la UI: `path` en desktop, `file` en web. */
export interface SelectedPhoto {
  id: string;
  originalName: string;
  path?: string;
  file?: File;
}

/** Contrato que implementan Tauri (desktop) y la web. La UI sólo habla con esto. */
export interface Platform {
  selectPhotos(): Promise<SelectedPhoto[]>;
  thumbnailUrl(photo: SelectedPhoto): Promise<string | null>;
  connect(): Promise<void>;
  listFolders(source: FolderSource, parentId?: string): Promise<DriveFolder[]>;
  listSharedDrives(): Promise<DriveFolder[]>;
  createFolder(name: string, parentId?: string): Promise<DriveFolder>;
  uploadPhoto(folderId: string, photo: SelectedPhoto, newName: string): Promise<void>;
}
