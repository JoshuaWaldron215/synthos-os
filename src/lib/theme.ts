// Theme switching: "system" follows the OS, "light"/"dark" are overrides.
// The resolved theme lands as data-theme on <html>; index.css flips the
// palette tokens under [data-theme="dark"].

export type ThemePref = "system" | "light" | "dark";

const media = () => window.matchMedia("(prefers-color-scheme: dark)");

export function resolveTheme(pref: ThemePref): "light" | "dark" {
  if (pref === "system") return media().matches ? "dark" : "light";
  return pref;
}

export function applyTheme(pref: ThemePref): void {
  const resolved = resolveTheme(pref);
  document.documentElement.dataset.theme = resolved;
  // keep the PWA status bar / browser chrome in step
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#0b0f17" : "#0B0F19");
}

/** Re-apply while pref is "system" and the OS theme changes. Returns cleanup. */
export function watchSystemTheme(onChange: () => void): () => void {
  const m = media();
  m.addEventListener("change", onChange);
  return () => m.removeEventListener("change", onChange);
}
