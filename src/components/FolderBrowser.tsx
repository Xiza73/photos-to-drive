import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  listFolders,
  listSharedDrives,
  createFolder,
  FOLDER_SOURCES,
  type FolderSource,
  type DriveFolder,
} from "../lib/drive";
import { FolderOpen, FolderPlus, HardDrive, Check, X, Loader2 } from "./icons";
import { cn } from "../lib/cn";

interface FolderBrowserProps {
  onSelect: (folder: DriveFolder) => void;
  onClose: () => void;
}

const TABS: { source: FolderSource; label: string }[] = [
  { source: FOLDER_SOURCES.MY_DRIVE, label: "Mi unidad" },
  { source: FOLDER_SOURCES.SHARED_WITH_ME, label: "Compartido conmigo" },
  { source: FOLDER_SOURCES.SHARED_DRIVES, label: "Unidades compartidas" },
];

export function FolderBrowser({ onSelect, onClose }: FolderBrowserProps) {
  const [source, setSource] = useState<FolderSource>(FOLDER_SOURCES.MY_DRIVE);
  const [path, setPath] = useState<DriveFolder[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const tip = path.length > 0 ? path[path.length - 1] : null;
  const atDriveList = source === FOLDER_SOURCES.SHARED_DRIVES && path.length === 0;
  // Carpeta seleccionable actual (raíz de Mi unidad, o la carpeta en la que estás).
  const current: DriveFolder | null =
    tip ?? (source === FOLDER_SOURCES.MY_DRIVE ? { id: "root", name: "Mi unidad" } : null);
  const canCreate = source === FOLDER_SOURCES.MY_DRIVE || tip !== null;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = atDriveList
        ? await listSharedDrives()
        : await listFolders(source, tip?.id);
      setFolders(list);
    } catch (e) {
      setError(String(e));
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, [source, tip?.id, atDriveList]);

  useEffect(() => {
    load();
  }, [load]);

  function changeTab(s: FolderSource) {
    setSource(s);
    setPath([]);
    setCreating(false);
    setNewName("");
  }

  async function confirmCreate() {
    const name = newName.trim();
    if (!name) return;
    try {
      await createFolder(name, tip?.id);
      setNewName("");
      setCreating(false);
      await load();
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl bg-card border border-brand/25 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand/15">
          <span className="font-display font-bold text-sm">Elegir carpeta</span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-3 pt-3 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.source}
              onClick={() => changeTab(t.source)}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-mono transition-colors",
                source === t.source
                  ? "bg-brand/15 text-brand-light"
                  : "text-muted-foreground hover:bg-white/5"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 flex-wrap px-5 py-3 text-xs font-mono text-muted-foreground">
          <button
            onClick={() => setPath([])}
            className="hover:text-brand-light transition-colors"
          >
            {TABS.find((t) => t.source === source)?.label}
          </button>
          {path.map((f, i) => (
            <span key={f.id} className="flex items-center gap-1 min-w-0">
              <span className="opacity-50">›</span>
              <button
                onClick={() => setPath((p) => p.slice(0, i + 1))}
                className="hover:text-brand-light transition-colors truncate max-w-[120px]"
              >
                {f.name}
              </button>
            </span>
          ))}
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-3 min-h-[160px]">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : error ? (
            <p className="px-2 py-6 text-xs text-red-300 font-mono">{error}</p>
          ) : folders.length === 0 ? (
            <p className="px-2 py-6 text-xs text-muted-foreground font-mono text-center">
              No hay carpetas aquí.
            </p>
          ) : (
            <div className="flex flex-col gap-1 pb-2">
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="group flex items-center gap-2 rounded-lg px-3 py-2.5 hover:bg-brand/5 transition-colors"
                >
                  <button
                    onClick={() => {
                      setPath((p) => [...p, folder]);
                      setCreating(false);
                    }}
                    className="flex items-center gap-2 flex-1 min-w-0 text-left"
                  >
                    {atDriveList ? (
                      <HardDrive className="w-4 h-4 flex-shrink-0 text-brand" />
                    ) : (
                      <FolderOpen className="w-4 h-4 flex-shrink-0 text-brand" />
                    )}
                    <span className="text-sm truncate">{folder.name}</span>
                  </button>
                  <button
                    onClick={() => onSelect(folder)}
                    className="px-2.5 py-1 rounded-md text-[11px] font-mono opacity-0 group-hover:opacity-100 bg-brand/15 text-brand-light hover:bg-brand/25 transition-all flex-shrink-0"
                  >
                    Elegir
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-brand/15 px-4 py-3">
          {creating ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && confirmCreate()}
                placeholder="Nombre de carpeta…"
                className="flex-1 rounded-lg px-3 py-2 text-sm font-mono bg-surface border border-brand/30 focus:outline-none placeholder:text-muted-foreground/50"
              />
              <button
                onClick={confirmCreate}
                disabled={!newName.trim()}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-brand text-white disabled:opacity-50 flex-shrink-0"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setCreating(false);
                  setNewName("");
                }}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-brand/20 text-muted-foreground flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setCreating(true)}
                disabled={!canCreate}
                className="flex items-center gap-1.5 text-xs font-mono text-brand-light disabled:opacity-40 disabled:cursor-not-allowed hover:text-brand transition-colors"
              >
                <FolderPlus className="w-4 h-4" /> Nueva carpeta
              </button>
              <button
                onClick={() => current && onSelect(current)}
                disabled={!current}
                className={cn(
                  "px-4 py-2 rounded-lg text-xs font-mono transition-all truncate max-w-[220px]",
                  current
                    ? "bg-brand text-white hover:opacity-90"
                    : "bg-white/5 text-muted-foreground cursor-not-allowed"
                )}
              >
                {current ? `Usar: ${current.name}` : "Entra a una carpeta"}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
