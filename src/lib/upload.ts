import { renamePhotos } from "./rename";
import type { SelectedPhoto } from "./platform/types";

export interface UploadItem {
  photo: SelectedPhoto;
  name: string;
}

/** Empareja cada foto con su nombre renombrado, respetando el orden. */
export function buildUploadItems(
  baseName: string,
  photos: SelectedPhoto[],
  startOrder = 1
): UploadItem[] {
  const renamed = renamePhotos({ baseName, photos, startOrder });
  return photos.map((photo, index) => ({
    photo,
    name: renamed[index].newName,
  }));
}
