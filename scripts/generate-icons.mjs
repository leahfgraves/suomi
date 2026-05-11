/**
 * Run once after npm install to generate PNG icons for PWA/iOS Safari:
 *   node scripts/generate-icons.mjs
 *
 * Requires: npm install -D sharp (already in devDependencies if you ran npm install)
 */
import { createCanvas } from "canvas";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");

  // Background
  ctx.fillStyle = "#0f2419";
  const r = size * 0.2;
  ctx.beginPath();
  ctx.moveTo(r, 0);
  ctx.lineTo(size - r, 0);
  ctx.quadraticCurveTo(size, 0, size, r);
  ctx.lineTo(size, size - r);
  ctx.quadraticCurveTo(size, size, size - r, size);
  ctx.lineTo(r, size);
  ctx.quadraticCurveTo(0, size, 0, size - r);
  ctx.lineTo(0, r);
  ctx.quadraticCurveTo(0, 0, r, 0);
  ctx.closePath();
  ctx.fill();

  // Inner card
  ctx.fillStyle = "#1a3a2e";
  const pad = size * 0.12;
  ctx.fillRect(pad, pad, size - pad * 2, size - pad * 2);

  // Finnish cross — horizontal
  ctx.fillStyle = "#e8b84b";
  const crossW = size * 0.125;
  const crossY = size * 0.44;
  ctx.fillRect(pad, crossY, size - pad * 2, crossW);

  // Finnish cross — vertical
  const crossX = size * 0.375;
  ctx.fillRect(crossX, pad, crossW, size - pad * 2);

  // S letter
  ctx.fillStyle = "#4ecb8d";
  ctx.font = `900 ${Math.round(size * 0.28)}px Arial`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("S", size / 2, size / 2);

  return canvas.toBuffer("image/png");
}

for (const size of [192, 512]) {
  const buf = drawIcon(size);
  const dest = join(__dirname, `../public/icon-${size}.png`);
  writeFileSync(dest, buf);
  console.log(`✓ Generated icon-${size}.png`);
}
