import { renamePhotos } from "./rename";
import type { SelectedPhoto } from "./photos";

export interface UploadItem {
  path: string;
  name: string;
}

/** Empareja cada foto (su path) con su nombre renombrado, respetando el orden. */
export function buildUploadItems(
  baseName: string,
  photos: SelectedPhoto[],
  startOrder = 1
): UploadItem[] {
  const renamed = renamePhotos({ baseName, photos, startOrder });
  return photos.map((photo, index) => ({
    path: photo.path,
    name: renamed[index].newName,
  }));
}
