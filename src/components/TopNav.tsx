import { Upload, Link2, Unlink2 } from "./icons";
import { cn } from "../lib/cn";

interface TopNavProps {
  connected: boolean;
  busy: boolean;
  onToggle: () => void;
}

export function TopNav({ connected, busy, onToggle }: TopNavProps) {
  return (
    <nav className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-5 border-b border-brand/15 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7c5cfc, #a78bfa)" }}
        >
          <Upload className="w-4 h-4 text-white" />
        </div>
        <span className="text-xl font-black tracking-tight font-display">DriveShot</span>
      </div>

      <button
        onClick={onToggle}
        disabled={busy}
        aria-label={connected ? "Desconectar Drive" : "Conectar Google Drive"}
        className={cn(
          "flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-mono font-medium transition-all duration-300 disabled:opacity-60",
          connected
            ? "bg-brand/10 border border-brand/35 text-brand-light"
            : "border border-transparent text-white"
        )}
        style={
          connected ? undefined : { background: "linear-gradient(135deg, #7c5cfc, #9b72ff)" }
        }
      >
        {connected ? <Unlink2 className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
        <span className="hidden sm:inline">
          {connected ? "Desconectar Drive" : "Conectar Google Drive"}
        </span>
        {connected && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
      </button>
    </nav>
  );
}
