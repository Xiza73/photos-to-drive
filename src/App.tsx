import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
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
import { GlowBackground } from "./components/GlowBackground";
import { TopNav } from "./components/TopNav";
import {
  FileImage,
  FolderOpen,
  ChevronDown,
  FolderPlus,
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
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [folderName, setFolderName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, errors: 0 });
  const [folderOpen, setFolderOpen] = useState(false);
  const [newFolderMode, setNewFolderMode] = useState(false);

  const preview =
    baseName.trim() && photos.length > 0
      ? renamePhotos({ baseName, photos })
      : [];
  const selectedFolder = folders.find((f) => f.id === selectedFolderId) ?? null;
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
      if (selected.length > 0) setPhotos(selected);
    } catch (e) {
      setStatus(`❌ Error al seleccionar: ${String(e)}`);
    }
  }

  const removePhoto = (index: number) =>
    setPhotos((p) => p.filter((_, i) => i !== index));

  async function toggleDrive() {
    if (authed) {
      setAuthed(false);
      setFolders([]);
      setSelectedFolderId("");
      setFolderOpen(false);
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
      setNewFolderMode(false);
      setFolderOpen(false);
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
            {/* Identificador (arriba, define el renombrado de las cards) */}
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
                  <p className="font-medium mb-1 text-base">Haz clic para seleccionar fotos</p>
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
                      Limpiar todo
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
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 bg-brand/10">
                            <FileImage className="w-4 h-4 text-brand" />
                          </div>
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
                <div className="relative">
                  <button
                    onClick={() => {
                      setFolderOpen(!folderOpen);
                      setNewFolderMode(false);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all",
                      selectedFolder
                        ? "bg-brand/10 border border-brand/40 text-foreground"
                        : "bg-surface border border-brand/20 text-muted-foreground"
                    )}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <FolderOpen
                        className={cn(
                          "w-4 h-4 flex-shrink-0",
                          selectedFolder ? "text-brand" : "text-muted-foreground"
                        )}
                      />
                      <span className="truncate">
                        {selectedFolder ? selectedFolder.name : "Seleccionar carpeta…"}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        "w-4 h-4 flex-shrink-0 transition-transform text-muted-foreground",
                        folderOpen && "rotate-180"
                      )}
                    />
                  </button>

                  <AnimatePresence>
                    {folderOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-2 rounded-xl overflow-hidden z-30 bg-card border border-brand/25 shadow-2xl max-h-72 overflow-y-auto"
                      >
                        {folders.length === 0 && (
                          <p className="px-4 py-3 text-xs text-muted-foreground font-mono">
                            No hay carpetas.
                          </p>
                        )}
                        {folders.map((folder) => (
                          <button
                            key={folder.id}
                            onClick={() => {
                              setSelectedFolderId(folder.id);
                              setFolderOpen(false);
                            }}
                            className={cn(
                              "w-full flex items-center gap-2 px-4 py-3 text-sm text-left transition-colors hover:bg-brand/5",
                              selectedFolderId === folder.id && "bg-brand/10"
                            )}
                          >
                            <FolderOpen
                              className={cn(
                                "w-4 h-4 flex-shrink-0",
                                selectedFolderId === folder.id ? "text-brand" : "text-muted-foreground"
                              )}
                            />
                            <span className="truncate">{folder.name}</span>
                          </button>
                        ))}
                        <div className="border-t border-brand/15">
                          {newFolderMode ? (
                            <div className="flex items-center gap-2 px-3 py-2.5">
                              <input
                                autoFocus
                                type="text"
                                value={folderName}
                                onChange={(e) => setFolderName(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && makeFolder()}
                                placeholder="Nombre de carpeta…"
                                className="flex-1 rounded-lg px-3 py-2 text-sm font-mono bg-surface border border-brand/30 focus:outline-none placeholder:text-muted-foreground/50"
                              />
                              <button
                                onClick={makeFolder}
                                disabled={busy || !folderName.trim()}
                                className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 bg-brand text-white disabled:opacity-50"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setNewFolderMode(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 border border-brand/20 text-muted-foreground"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setNewFolderMode(true)}
                              className="w-full flex items-center gap-2 px-4 py-3 text-sm text-brand-light hover:bg-brand/5 transition-colors"
                            >
                              <FolderPlus className="w-4 h-4" />
                              Nueva carpeta
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
    </div>
  );
}

export default App;
