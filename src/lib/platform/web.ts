import type { Platform } from "./types";

// Fase 2: se implementa con <input type="file">, File API, Google Identity
// Services (GIS) y fetch a la Drive API. Por ahora, stub.
const notImplemented = async (): Promise<never> => {
  throw new Error("Versión web: en construcción (Fase 2).");
};

export const webPlatform: Platform = {
  selectPhotos: notImplemented,
  thumbnailUrl: notImplemented,
  connect: notImplemented,
  listFolders: notImplemented,
  listSharedDrives: notImplemented,
  createFolder: notImplemented,
  uploadPhoto: notImplemented,
};
