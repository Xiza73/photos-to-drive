import { useState } from "react";
import { selectPhotos, type SelectedPhoto } from "./lib/photos";
import { renamePhotos } from "./lib/rename";
import { buildUploadItems } from "./lib/upload";
import {
  googleLogin,
  listFolders,
  createFolder,
  uploadFile,
  type DriveFolder,
} from "./lib/drive";
import "./App.css";

function App() {
  const [baseName, setBaseName] = useState("");
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [authed, setAuthed] = useState(false);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [folderName, setFolderName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 });

  const preview =
    baseName.trim() && photos.length > 0
      ? renamePhotos({ baseName, photos })
      : [];

  const canUpload = authed && !!selectedFolderId && preview.length > 0 && !uploading;

  async function pickPhotos() {
    try {
      const selected = await selectPhotos();
      if (selected.length > 0) setPhotos(selected);
    } catch (e) {
      setStatus(`❌ Error al seleccionar: ${String(e)}`);
    }
  }

  async function connect() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      setStatus("⚠️ Faltan VITE_GOOGLE_CLIENT_ID / VITE_GOOGLE_CLIENT_SECRET en .env.");
      return;
    }
    setBusy(true);
    setStatus("Abriendo Google… autorizá en el navegador y volvé.");
    try {
      await googleLogin(clientId, clientSecret);
      setAuthed(true);
      const list = await listFolders();
      setFolders(list);
      setStatus(`✅ Conectado — ${list.length} carpetas.`);
    } catch (e) {
      setStatus(`❌ Error: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function makeFolder() {
    const name = folderName.trim();
    if (!name) return;
    setBusy(true);
    try {
      const folder = await createFolder(name);
      setFolders((prev) => [folder, ...prev]);
      setSelectedFolderId(folder.id);
      setFolderName("");
      setStatus(`✅ Carpeta "${folder.name}" creada.`);
    } catch (e) {
      setStatus(`❌ Error al crear: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function upload() {
    if (!canUpload) return;
    const items = buildUploadItems(baseName, photos);
    setUploading(true);
    setProgress({ done: 0, total: items.length, errors: 0 });
    let done = 0;
    let errors = 0;
    for (const item of items) {
      try {
        await uploadFile(selectedFolderId, item.path, item.name);
      } catch {
        errors++;
      }
      done++;
      setProgress({ done, total: items.length, errors });
    }
    setUploading(false);
    setStatus(
      errors === 0
        ? `✅ ${done} fotos subidas.`
        : `⚠️ ${done - errors}/${done} subidas, ${errors} con error.`
    );
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
        {!authed ? (
          <button onClick={connect} disabled={busy}>
            {busy ? "Esperando…" : "Conectar Google Drive"}
          </button>
        ) : (
          <>
            <div className="row">
              <input
                value={folderName}
                onChange={(e) => setFolderName(e.currentTarget.value)}
                placeholder="identificador de carpeta"
              />
              <button onClick={makeFolder} disabled={busy || !folderName.trim()}>
                Crear carpeta
              </button>
            </div>
            <select
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.currentTarget.value)}
            >
              <option value="">— elegí una carpeta —</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </>
        )}
      </section>

      <section>
        <h2>4. Subir</h2>
        <button onClick={upload} disabled={!canUpload}>
          {uploading ? `Subiendo ${progress.done}/${progress.total}…` : "Subir a Drive"}
        </button>
        {(uploading || progress.done > 0) && (
          <p>
            {progress.done}/{progress.total}
            {progress.errors > 0 && ` · ${progress.errors} con error`}
          </p>
        )}
      </section>

      <p>{status}</p>
    </main>
  );
}

export default App;
