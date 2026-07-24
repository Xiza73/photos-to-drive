/** Glows ambientales del fondo (decorativo, sin interacción). */
export function GlowBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      <div
        className="absolute -top-32 left-1/4 w-[700px] h-[500px] rounded-full opacity-30"
        style={{ background: "radial-gradient(ellipse, #7c5cfc 0%, transparent 70%)", filter: "blur(80px)" }}
      />
      <div
        className="absolute bottom-0 right-0 w-[500px] h-[400px] rounded-full opacity-20"
        style={{ background: "radial-gradient(ellipse, #f472b6 0%, transparent 70%)", filter: "blur(100px)" }}
      />
      <div
        className="absolute top-1/2 left-0 w-[300px] h-[300px] rounded-full opacity-15"
        style={{ background: "radial-gradient(ellipse, #22d3ee 0%, transparent 70%)", filter: "blur(80px)" }}
      />
    </div>
  );
}
