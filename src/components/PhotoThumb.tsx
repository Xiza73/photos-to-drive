import { useState, useEffect } from "react";
import { readFile } from "@tauri-apps/plugin-fs";
import { FileImage } from "./icons";

function mimeFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
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

interface PhotoThumbProps {
  path: string;
  alt: string;
}

/**
 * Miniatura de una foto local. Lee los bytes con plugin-fs (URI-aware: sirve
 * para rutas de desktop y `content://` de Android). Cae al ícono si algo falla.
 */
export function PhotoThumb({ path, alt }: PhotoThumbProps) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    readFile(path)
      .then((bytes) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(new Blob([bytes], { type: mimeFor(path) }));
        setUrl(objectUrl);
      })
      .catch(() => {
        /* sin permiso o URI ilegible → se muestra el ícono */
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

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
      alt={alt}
      className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
      onError={() => setUrl(null)}
    />
  );
}
