/**
 * Removes the white background from "public/logo applezone.png" using a
 * flood-fill from the image borders.  Produces two outputs:
 *   public/logo-applezone.png  — full lockup (apple + text)
 *   public/logo-mark.png       — just the apple mark (top ~58% of image)
 */
import sharp from 'sharp';
import { existsSync } from 'fs';

const INPUT = 'assets-src/logo applezone.png';

if (!existsSync(INPUT)) {
  console.error(`File not found: ${INPUT}`);
  process.exit(1);
}

const { data, info } = await sharp(INPUT)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const { width, height } = info;
const CHANNELS = 4; // RGBA
const TOLERANCE = 40; // distance from background color to be considered background

function idx(x, y) { return (y * width + x) * CHANNELS; }
function getColor(x, y) {
  const i = idx(x, y);
  return [data[i], data[i + 1], data[i + 2]];
}
function dist([r1, g1, b1], [r2, g2, b2]) {
  return Math.sqrt((r1-r2)**2 + (g1-g2)**2 + (b1-b2)**2);
}
function makeTransparent(x, y) {
  data[idx(x, y) + 3] = 0;
}

// Sample background from corners
const bg = getColor(0, 0);

const visited = new Uint8Array(width * height);
const queue = [];

function seed(x, y) {
  if (x < 0 || x >= width || y < 0 || y >= height) return;
  const vi = y * width + x;
  if (visited[vi]) return;
  if (dist(getColor(x, y), bg) <= TOLERANCE) {
    visited[vi] = 1;
    queue.push(x, y); // push as flat pairs for speed
  }
}

// Seed from all 4 edges
for (let x = 0; x < width; x++) { seed(x, 0); seed(x, height - 1); }
for (let y = 0; y < height; y++) { seed(0, y); seed(width - 1, y); }

// BFS flood fill
let qi = 0;
while (qi < queue.length) {
  const x = queue[qi++];
  const y = queue[qi++];
  makeTransparent(x, y);
  seed(x + 1, y);
  seed(x - 1, y);
  seed(x, y + 1);
  seed(x, y - 1);
}

// ── Full lockup (resized for web — máx 320px de alto) ───────────────────────
await sharp(Buffer.from(data), { raw: { width, height, channels: CHANNELS } })
  .resize({ height: 320 })
  .png({ compressionLevel: 9, quality: 90 })
  .toFile('public/logo-applezone.png');
console.log('✓ public/logo-applezone.png');

// ── Apple mark only (top 58% of image) — redimensionado a 128px de alto ──────
// Se muestra a 32px (h-8) en el Navbar; 128px da nitidez retina 4x.
const markHeight = Math.round(height * 0.58);
await sharp(Buffer.from(data), { raw: { width, height, channels: CHANNELS } })
  .extract({ left: 0, top: 0, width, height: markHeight })
  .resize({ height: 128 })
  .png({ compressionLevel: 9, quality: 90 })
  .toFile('public/logo-mark.png');
console.log('✓ public/logo-mark.png');
