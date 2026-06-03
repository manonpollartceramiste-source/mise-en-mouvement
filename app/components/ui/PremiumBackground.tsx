export function PremiumBackground({ src }: { src: string | null }) {
  if (!src) return null;
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          filter: "blur(26px) saturate(0.45) contrast(0.85)",
          opacity: 0.10,
          transform: "scale(1.8)",
          transformOrigin: "center",
        }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "var(--color-sand-50)", opacity: 0.50 }}
      />
    </div>
  );
}
