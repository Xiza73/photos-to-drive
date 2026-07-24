import { useState, useEffect } from "react";
import { platform, type SelectedPhoto } from "../lib/platform";
import { FileImage } from "./icons";

/**
 * Miniatura de una foto. Pide la URL a la capa de plataforma (blob de bytes en
 * desktop, objectURL del File en web). Cae al ícono si algo falla.
 */
export function PhotoThumb({ photo }: { photo: SelectedPhoto }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    platform
      .thumbnailUrl(photo)
      .then((u) => {
        if (cancelled) {
          if (u) URL.revokeObjectURL(u);
          return;
        }
        objectUrl = u;
        setUrl(u);
      })
      .catch(() => {
        /* se muestra el ícono */
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photo]);

  if (!url) {
    return (
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-brand/10">
        <FileImage className="w-4 h-4 text-brand" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={photo.originalName}
      className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
      onError={() => setUrl(null)}
    />
  );
}
