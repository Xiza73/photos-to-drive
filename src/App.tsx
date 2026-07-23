import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

type Folder = { id: string; name: string };

function App() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function login() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      setStatus("⚠️ Faltan VITE_GOOGLE_CLIENT_ID / VITE_GOOGLE_CLIENT_SECRET en .env (copiá .env.example).");
      return;
    }
    setBusy(true);
    setStatus("Abriendo Google… autorizá en el navegador y volvé.");
    try {
      const result = await invoke<Folder[]>("google_drive_login", { clientId, clientSecret });
      setFolders(result);
      setStatus(`✅ OK — ${result.length} carpetas visibles (incluye compartidas).`);
    } catch (e) {
      setStatus(`❌ Error: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <h1>Spike OAuth — Google Drive</h1>
      <p>Prueba el riesgo #1: login PKCE + captura del redirect + listar carpetas.</p>

      <button onClick={login} disabled={busy}>
        {busy ? "Esperando autorización…" : "Login con Google + listar carpetas"}
      </button>

      <p>{status}</p>

      {folders.length > 0 && (
        <ul style={{ textAlign: "left", maxWidth: 480, margin: "1rem auto" }}>
          {folders.map((f) => (
            <li key={f.id}>{f.name}</li>
          ))}
        </ul>
      )}
    </main>
  );
}

export default App;
