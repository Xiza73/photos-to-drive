import {
  FOLDER_SOURCES,
  type Platform,
  type SelectedPhoto,
  type DriveFolder,
  type FolderSource,
} from "./types";

const DRIVE_FILES = "https://www.googleapis.com/drive/v3/files";
const DRIVE_DRIVES = "https://www.googleapis.com/drive/v3/drives";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const SCOPE = "https://www.googleapis.com/auth/drive";

// --- Tipos mínimos de Google Identity Services (GIS) ---
interface TokenResponse {
  access_token: string;
  error?: string;
}
interface TokenClient {
  requestAccessToken: () => void;
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: TokenResponse) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

// --- Tipos mínimos de las respuestas de la Drive API ---
interface DriveFileRaw {
  id: string;
  name: string;
  capabilities?: { canAddChildren?: boolean };
}
interface DriveApiResponse {
  files?: DriveFileRaw[];
  drives?: DriveFileRaw[];
  id?: string;
  name?: string;
  error?: { message?: string };
}

let accessToken: string | null = null;

/** Carga el script de GIS una sola vez. */
function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-gis]");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("GIS no cargó")));
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.dataset.gis = "true";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("no se pudo cargar Google Identity Services"));
    document.head.appendChild(s);
  });
}

/** Precarga GIS al arrancar (para que el popup de login no se pierda tras un await). */
export function preloadGis(): void {
  void loadGis().catch(() => {});
}

function token(): string {
  if (!accessToken) throw new Error("no autenticado — conectá Google Drive primero");
  return accessToken;
}

async function driveGet(url: string): Promise<DriveApiResponse> {
  const resp = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
  const json: DriveApiResponse = await resp.json();
  if (!resp.ok) throw new Error(json.error?.message ?? `error ${resp.status}`);
  return json;
}

async function driveSend(
  method: string,
  url: string,
  body: unknown
): Promise<DriveApiResponse> {
  const resp = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json: DriveApiResponse = await resp.json();
  if (!resp.ok) throw new Error(json.error?.message ?? `error ${resp.status}`);
  return json;
}

function folderQuery(parentId: string | undefined, source: FolderSource): string {
  const base = `mimeType='${FOLDER_MIME}' and trashed=false`;
  if (parentId) return `'${parentId}' in parents and ${base}`;
  if (source === FOLDER_SOURCES.SHARED_WITH_ME) return `sharedWithMe=true and ${base}`;
  return `'root' in parents and ${base}`;
}

function toFolder(f: DriveFileRaw): DriveFolder {
  return { id: f.id, name: f.name, writable: f.capabilities?.canAddChildren ?? true };
}

/** Implementación web: File API + Google Identity Services + fetch a la Drive API. */
export const webPlatform: Platform = {
  async selectPhotos() {
    return new Promise<SelectedPhoto[]>((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.accept = "image/*";
      let settled = false;
      input.onchange = () => {
        settled = true;
        const files = Array.from(input.files ?? []);
        resolve(
          files.map((file, i) => ({
            id: `${file.name}-${file.size}-${file.lastModified}-${i}`,
            originalName: file.name,
            file,
          }))
        );
      };
      // ponytail: el input no emite evento al cancelar → lo detectamos al volver el foco.
      window.addEventListener(
        "focus",
        () => setTimeout(() => !settled && resolve([]), 400),
        { once: true }
      );
      input.click();
    });
  },

  async thumbnailUrl(photo) {
    return photo.file ? URL.createObjectURL(photo.file) : null;
  },

  async connect() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID_WEB;
    if (!clientId) throw new Error("Falta VITE_GOOGLE_CLIENT_ID_WEB en .env.");
    await loadGis();
    const oauth2 = window.google?.accounts.oauth2;
    if (!oauth2) throw new Error("Google Identity Services no disponible.");
    await new Promise<void>((resolve, reject) => {
      const client = oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPE,
        callback: (resp) => {
          if (resp.error) {
            reject(new Error(resp.error));
            return;
          }
          accessToken = resp.access_token;
          resolve();
        },
      });
      client.requestAccessToken();
    });
  },

  async listFolders(source, parentId) {
    const params = new URLSearchParams({
      q: folderQuery(parentId, source),
      fields: "files(id,name,capabilities/canAddChildren)",
      pageSize: "200",
      orderBy: "name",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (parentId) params.set("corpora", "allDrives");
    const json = await driveGet(`${DRIVE_FILES}?${params.toString()}`);
    return (json.files ?? []).map(toFolder);
  },

  async listSharedDrives() {
    const json = await driveGet(
      `${DRIVE_DRIVES}?pageSize=100&fields=drives(id,name,capabilities/canAddChildren)`
    );
    return (json.drives ?? []).map(toFolder);
  },

  async createFolder(name, parentId) {
    const body: Record<string, unknown> = { name, mimeType: FOLDER_MIME };
    if (parentId) body.parents = [parentId];
    const json = await driveSend(
      "POST",
      `${DRIVE_FILES}?fields=id,name&supportsAllDrives=true`,
      body
    );
    return { id: json.id ?? "", name: json.name ?? name, writable: true };
  },

  async uploadPhoto(folderId, photo, newName) {
    if (!photo.file) throw new Error("foto sin archivo");
    // 1. metadata (nombre + carpeta)
    const created = await driveSend(
      "POST",
      `${DRIVE_FILES}?fields=id&supportsAllDrives=true`,
      { name: newName, parents: [folderId] }
    );
    // 2. contenido (media upload)
    const url = `https://www.googleapis.com/upload/drive/v3/files/${created.id}?uploadType=media&supportsAllDrives=true`;
    const resp = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token()}`,
        "Content-Type": photo.file.type || "application/octet-stream",
      },
      body: photo.file,
    });
    if (!resp.ok) throw new Error(`upload error: ${await resp.text()}`);
  },
};
