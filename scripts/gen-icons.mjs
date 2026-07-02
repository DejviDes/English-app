// Generates the PWA icon set: an indigo→violet diagonal gradient with a white "E".
// Run: node scripts/gen-icons.mjs
import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';

const INDIGO = [99, 102, 241]; // #6366f1
const VIOLET = [124, 58, 237]; // #7c3aed

const lerp = (a, b, t) => Math.round(a + (b - a) * t);

// Is fractional point (fx, fy) inside the block letter "E"?
function inE(fx, fy) {
  const x0 = 0.32,
    x1 = 0.68,
    y0 = 0.26,
    y1 = 0.74,
    th = 0.1;
  const ymid = (y0 + y1) / 2;
  const inYspan = fy >= y0 && fy <= y1;
  const vertical = fx >= x0 && fx <= x0 + th && inYspan;
  const top = fy >= y0 && fy <= y0 + th && fx >= x0 && fx <= x1;
  const mid = fy >= ymid - th / 2 && fy <= ymid + th / 2 && fx >= x0 && fx <= x0 + 0.78 * (x1 - x0);
  const bottom = fy >= y1 - th && fy <= y1 && fx >= x0 && fx <= x1;
  return vertical || top || mid || bottom;
}

function makeIcon(size, file) {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      const fx = x / (size - 1);
      const fy = y / (size - 1);
      if (inE(fx, fy)) {
        png.data[idx] = 255;
        png.data[idx + 1] = 255;
        png.data[idx + 2] = 255;
      } else {
        const t = (fx + fy) / 2;
        png.data[idx] = lerp(INDIGO[0], VIOLET[0], t);
        png.data[idx + 1] = lerp(INDIGO[1], VIOLET[1], t);
        png.data[idx + 2] = lerp(INDIGO[2], VIOLET[2], t);
      }
      png.data[idx + 3] = 255; // opaque (iOS masks corners itself)
    }
  }
  writeFileSync(file, PNG.sync.write(png));
  console.log('wrote', file);
}

makeIcon(192, 'public/icon-192.png');
makeIcon(512, 'public/icon-512.png');
makeIcon(512, 'public/icon-512-maskable.png');
makeIcon(180, 'public/apple-touch-icon.png');
