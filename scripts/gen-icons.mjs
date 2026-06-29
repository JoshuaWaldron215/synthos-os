// Regenerate all PWA / home-screen icons from the canonical Synthos logo.
// Run with:  npm run icons
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, "../src/assets/app-icon.png");
const OUT = resolve(here, "../public");

// Light lavender sampled from the logo — only used to flatten any residual
// alpha on full-bleed icons (not visible with the overscan below).
const FLATTEN_BG = "#ECE9FB";

// "any" purpose: the full rounded tile on a transparent canvas.
async function contain(size, file) {
  await sharp(SRC)
    .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(resolve(OUT, file));
  console.log("  ✓", file, `(${size}×${size}, contain)`);
}

// Full-bleed: scale up and center-crop so the rounded corners fall outside the
// frame. Used for maskable (Android adaptive) and the iOS apple-touch-icon, so
// the OS mask defines the shape with the mark safely centered.
async function bleed(size, file, scale = 1.5) {
  const big = Math.round(size * scale);
  const scaled = await sharp(SRC).resize(big, big, { fit: "cover" }).toBuffer();
  const off = Math.round((big - size) / 2);
  await sharp(scaled)
    .extract({ left: off, top: off, width: size, height: size })
    .flatten({ background: FLATTEN_BG })
    .png()
    .toFile(resolve(OUT, file));
  console.log("  ✓", file, `(${size}×${size}, full-bleed)`);
}

console.log("Generating icons from", SRC);
await contain(192, "pwa-192x192.png");
await contain(512, "pwa-512x512.png");
await bleed(180, "apple-touch-icon.png");
await bleed(512, "maskable-512x512.png");
console.log("Done.");
