import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { selectPhotos, type SelectedPhoto } from "./lib/photos";
import { renamePhotos } from "./lib/rename";
import { buildUploadItems } from "./lib/upload";
import { googleLogin, uploadFile, type DriveFolder } from "./lib/drive";
import { GlowBackground } from "./components/GlowBackground";
import { TopNav } from "./components/TopNav";
import { FolderBrowser } from "./components/FolderBrowser";
import { PhotoThumb } from "./components/PhotoThumb";
import {
  FileImage,
  FolderOpen,
  Check,
  X,
  HardDrive,
  Upload,
  Loader2,
} from "./components/icons";
import { cn } from "./lib/cn";

function App() {
  const [baseName, setBaseName] = useState("");
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [authed, setAuthed] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<DriveFolder | null>(null);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 });

  const preview =
    baseName.trim() && photos.length > 0
      ? renamePhotos({ baseName, photos })
      : [];
  const canUpload = authed && !!selectedFolder && preview.length > 0 && !uploading;

  const plural = photos.length !== 1 ? "s" : "";
  const checks = [
    { label: authed ? "Drive conectado" : "Drive sin conectar", ok: authed },
    {
      label: photos.length > 0 ? `${photos.length} foto${plural} seleccionada${plural}` : "Sin fotos",
      ok: photos.length > 0,
    },
    {
      label: baseName.trim() ? `Nombre: "${baseName.trim()}"` : "Sin identificador",
      ok: !!baseName.trim(),
    },
    {
      label: selectedFolder ? `Carpeta: ${selectedFolder.name}` : "Sin carpeta",
      ok: !!selectedFolder,
    },
  ];

  async function pickPhotos() {
    try {
      const selected = await selectPhotos();
      if (selected.length === 0) return;
      setPhotos((prev) => {
        const existing = new Set(prev.map((p) => p.path));
        const fresh = selected.filter((p) => !existing.has(p.path));
        return [...prev, ...fresh];
      });
    } catch (e) {
      setStatus(`❌ Error al seleccionar: ${String(e)}`);
    }
  }

  const removePhoto = (index: number) =>
    setPhotos((p) => p.filter((_, i) => i !== index));

  async function toggleDrive() {
    if (authed) {
      setAuthed(false);
      setSelectedFolder(null);
      setStatus("Drive desconectado.");
      return;
    }
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      setStatus("⚠️ Faltan VITE_GOOGLE_CLIENT_ID / VITE_GOOGLE_CLIENT_SECRET en .env.");
      return;
    }
    setBusy(true);
    setStatus("Abriendo Google… autoriza en el navegador y vuelve.");
    try {
      await googleLogin(clientId, clientSecret);
      setAuthed(true);
      setStatus("✅ Conectado a Google Drive.");
    } catch (e) {
      setStatus(`❌ Error: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function upload() {
    if (!canUpload || !selectedFolder) return;
    const items = buildUploadItems(baseName, photos);
    setUploading(true);
    setProgress({ done: 0, total: items.length, errors: 0 });
    let done = 0;
    let errors = 0;
    for (const item of items) {
      try {
        await uploadFile(selectedFolder.id, item.path, item.name);
      } catch {
        errors++;
      }
      done++;
      setProgress({ done, total: items.length, errors });
    }
    setUploading(false);
    if (errors === 0) {
      // Éxito total: limpiamos el lote (fotos + identificador), mantenemos carpeta y sesión.
      setPhotos([]);
      setBaseName("");
      setProgress({ done: 0, total: 0, errors: 0 });
      setStatus(`✅ ${done} fotos subidas. Listo para el próximo lote.`);
    } else {
      setStatus(`⚠️ ${done - errors}/${done} subidas, ${errors} con error.`);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <GlowBackground />
      <TopNav connected={authed} busy={busy} onToggle={toggleDrive} />

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-4xl font-black tracking-tight mb-2 leading-tight font-display">
            Subir fotos
            <br />
            <span className="text-brand">a Drive</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-3 font-mono">
            Selecciona · Renombra · Organiza · Sube
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* LEFT: identificador + dropzone + fotos */}
          <div className="lg:col-span-3 flex flex-col gap-5">
            {/* Identificador */}
            <div className="rounded-2xl p-5 bg-card/80 border border-brand/15">
              <label className="block text-xs uppercase tracking-[0.12em] mb-3 font-mono text-muted-foreground">
                Identificador de fotos
              </label>
              <input
                type="text"
                value={baseName}
                onChange={(e) => setBaseName(e.target.value)}
                placeholder="ej: verano_alpes"
                className="w-full rounded-xl px-4 py-3 text-sm font-mono bg-surface border border-brand/20 placeholder:text-muted-foreground/50 focus:outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/15 transition-all"
              />
            </div>

            {/* Dropzone */}
            <button
              onClick={pickPhotos}
              className="relative rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden border-2 border-dashed border-brand/30 bg-card/60 hover:border-brand/60 hover:bg-brand/5"
              style={{ minHeight: 180 }}
            >
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-brand/10 border border-brand/20">
                  <FileImage className="w-7 h-7 text-brand" />
                </div>
                <div>
                  <p className="font-medium mb-1 text-base">
                    {photos.length > 0 ? "Agregar más fotos" : "Haz clic para seleccionar fotos"}
                  </p>
                  <p className="text-muted-foreground text-xs font-mono">JPG · PNG · HEIC · WEBP</p>
                </div>
              </div>
            </button>

            {/* Fotos */}
            <AnimatePresence>
              {photos.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-foreground font-mono">
                      {photos.length} foto{plural} seleccionada{plural}
                    </span>
                    <button
                      onClick={() => setPhotos([])}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors font-mono"
                    >
                      Limpiar fotos
                    </button>
                  </div>

                  <div className="flex flex-col gap-2">
                    <AnimatePresence>
                      {photos.map((photo, i) => (
                        <motion.div
                          key={photo.path}
                          layout
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, x: -8 }}
                          transition={{ type: "spring", stiffness: 300, damping: 26 }}
                          className="group flex items-center gap-3 rounded-xl px-3 py-2.5 bg-card border border-brand/15"
                        >
                          <PhotoThumb path={photo.path} alt={photo.originalName} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{photo.originalName}</p>
                            {preview[i] && (
                              <p className="text-xs truncate font-mono text-brand-light">
                                → {preview[i].newName}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removePhoto(i)}
                            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-muted-foreground hover:bg-red-500/20 hover:text-red-300 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* RIGHT: carpeta + checklist + subir */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Carpeta */}
            <div className="rounded-2xl p-5 bg-card/80 border border-brand/15">
              <label className="block text-xs uppercase tracking-[0.12em] mb-3 font-mono text-muted-foreground">
                Carpeta de destino
              </label>
              {!authed ? (
                <div className="rounded-xl p-4 flex flex-col items-center text-center gap-2 border border-dashed border-brand/20 bg-brand/5">
                  <HardDrive className="w-5 h-5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground leading-relaxed font-mono">
                    Conecta Google Drive para
                    <br />
                    elegir una carpeta
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setBrowserOpen(true)}
                  className={cn(
                    "w-full flex items-center gap-2 px-4 py-3 rounded-xl text-sm transition-all",
                    selectedFolder
                      ? "bg-brand/10 border border-brand/40 text-foreground"
                      : "bg-surface border border-brand/20 text-muted-foreground"
                  )}
                >
                  <FolderOpen
                    className={cn(
                      "w-4 h-4 flex-shrink-0",
                      selectedFolder ? "text-brand" : "text-muted-foreground"
                    )}
                  />
                  <span className="truncate">
                    {selectedFolder ? selectedFolder.name : "Seleccionar carpeta…"}
                  </span>
                </button>
              )}
            </div>

            {/* Checklist */}
            <div className="rounded-2xl px-5 py-4 flex flex-col gap-2.5 bg-card/60 border border-brand/10">
              {checks.map(({ label, ok }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-all",
                      ok ? "bg-brand/25 border border-brand/50" : "bg-white/5 border border-white/10"
                    )}
                  >
                    {ok && <Check className="w-2.5 h-2.5 text-brand-light" />}
                  </div>
                  <span
                    className={cn(
                      "text-xs truncate font-mono transition-colors",
                      ok ? "text-brand-light" : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* Subir */}
            <button
              onClick={upload}
              disabled={!canUpload}
              className={cn(
                "relative w-full rounded-2xl py-4 px-6 font-display transition-all duration-300 overflow-hidden",
                canUpload
                  ? "text-white"
                  : "bg-card/80 text-muted-foreground border border-brand/10 cursor-not-allowed"
              )}
              style={
                canUpload
                  ? {
                      background: "linear-gradient(135deg, #7c5cfc 0%, #9b72ff 50%, #c084fc 100%)",
                      boxShadow: "0 8px 32px rgba(124,92,252,0.35)",
                    }
                  : undefined
              }
            >
              <span className="flex items-center justify-center gap-2 text-sm font-bold">
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Subiendo {progress.done}/{progress.total}…
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Subir{photos.length > 0 ? ` ${photos.length} foto${plural}` : " fotos"}
                  </>
                )}
              </span>
            </button>

            {status && (
              <p className="text-xs text-center text-muted-foreground font-mono mt-1">{status}</p>
            )}
          </div>
        </div>
      </main>

      {browserOpen && (
        <FolderBrowser
          onSelect={(f) => {
            setSelectedFolder(f);
            setBrowserOpen(false);
          }}
          onClose={() => setBrowserOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
