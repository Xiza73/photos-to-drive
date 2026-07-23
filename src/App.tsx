import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { selectPhotos, type SelectedPhoto } from "./lib/photos";
import { renamePhotos } from "./lib/rename";
import "./App.css";

type Folder = { id: string; name: string };

function App() {
  const [baseName, setBaseName] = useState("");
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const preview =
    baseName.trim() && photos.length > 0
      ? renamePhotos({ baseName, photos })
      : [];

  async function pickPhotos() {
    try {
      const selected = await selectPhotos();
      if (selected.length > 0) setPhotos(selected);
    } catch (e) {
      setStatus(`❌ Error al seleccionar: ${String(e)}`);
    }
  }

  async function login() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      setStatus("⚠️ Faltan VITE_GOOGLE_CLIENT_ID / VITE_GOOGLE_CLIENT_SECRET en .env.");
      return;
    }
    setBusy(true);
    setStatus("Abriendo Google… autorizá en el navegador y volvé.");
    try {
      const result = await invoke<Folder[]>("google_drive_login", { clientId, clientSecret });
      setFolders(result);
      setStatus(`✅ ${result.length} carpetas visibles.`);
    } catch (e) {
      setStatus(`❌ Error: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <h1>Photos → Drive</h1>

      <section>
        <h2>1. Identificador de las fotos</h2>
        <input
          value={baseName}
          onChange={(e) => setBaseName(e.currentTarget.value)}
          placeholder="ej. boda"
        />
      </section>

      <section>
        <h2>2. Fotos</h2>
        <button onClick={pickPhotos}>Seleccionar fotos</button>
        {photos.length > 0 && <p>{photos.length} seleccionadas</p>}
        {preview.length > 0 && (
          <ul style={{ textAlign: "left", maxWidth: 520, margin: "1rem auto" }}>
            {preview.map((p) => (
              <li key={p.order}>
                <code>{p.originalName}</code> → <strong>{p.newName}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>3. Carpeta en Drive</h2>
        <button onClick={login} disabled={busy}>
          {busy ? "Esperando…" : "Conectar Google Drive"}
        </button>
        {folders.length > 0 && (
          <ul style={{ textAlign: "left", maxWidth: 520, margin: "1rem auto" }}>
            {folders.slice(0, 10).map((f) => (
              <li key={f.id}>{f.name}</li>
            ))}
          </ul>
        )}
      </section>

      <p>{status}</p>
    </main>
  );
}

export default App;
