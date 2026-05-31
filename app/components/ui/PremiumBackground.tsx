/**
 * Arrière-plan premium : photo d'ambiance fondue dans le fond du site.
 * Rendu : opacité légère + flou + dégradé sable par-dessus → texture visuelle
 * discrète sans jamais gêner la lecture.
 */
export function PremiumBackground({ src }: { src: string | null }) {
  if (!src) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Image floutée et assombrie */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          filter: "blur(22px) saturate(0.7)",
          opacity: 0.13,
          transform: "scale(1.15)",
          transformOrigin: "center",
        }}
      />
      {/* Dégradé sable radial — vignettage + fondu bords */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 120% 100% at 50% 50%, transparent 30%, var(--color-sand-50) 80%)",
        }}
      />
      {/* Voile sable uniforme pour garantir lisibilité */}
      <div
        className="absolute inset-0"
        style={{ background: "var(--color-sand-50)", opacity: 0.55 }}
      />
    </div>
  );
}
