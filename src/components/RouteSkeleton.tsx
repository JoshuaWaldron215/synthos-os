import type { CSSProperties } from "react";

// Branded Suspense fallback for lazy routes: eyebrow, heading and card ghosts
// with a soft shimmer. Mirrors the standard surface layout so the swap from
// skeleton to content doesn't jump.
export function RouteSkeleton() {
  const bar = (w: string | number, h: number, r = 8): CSSProperties => ({
    width: w,
    height: h,
    borderRadius: r,
    background: "linear-gradient(90deg, rgba(11,15,25,.05) 25%, rgba(11,15,25,.09) 50%, rgba(11,15,25,.05) 75%)",
    backgroundSize: "600px 100%",
    animation: "lgShimmer 1.4s ease-in-out infinite",
  });
  return (
    <div aria-hidden style={{ maxWidth: 1120, margin: "0 auto" }}>
      <div style={{ ...bar(120, 12, 6), marginBottom: 16 }} />
      <div style={{ ...bar(260, 30), marginBottom: 10 }} />
      <div style={{ ...bar(340, 14), marginBottom: 28 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              ...bar("100%", 140, 18),
              animationDelay: i * 0.08 + "s",
            }}
          />
        ))}
      </div>
    </div>
  );
}
