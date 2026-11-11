// scripts/build-fruit-sprites.mjs
/**
 * 4x4 转盘大图（或 16 张散图）→ 16 张带 alpha 的 WebP 精灵帧。
 * 流程：切帧 → 边缘泛洪去白底（保留内部高光）→ 羽化 →
 *       16 帧共用 union bbox（防抖）→ 统一底部对齐落地 → 900x1440 WebP。
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const SRC  = get("--src", null);
const NAME = get("--name", "fruit");
const OUT  = get("--out", "public/assets/agrumea/fruits");
const TOL     = Number(get("--tol", 34));   // 背景判定容差(0-255)，高光被误切就调小
const FEATHER = Number(get("--feather", 26)); // 边缘羽化宽度
const COLS = 4, ROWS = 4;
const CANVAS_W = 900, CANVAS_H = 1440;      // 与 fruit-slider 的 img width/height 一致
const MARGIN = 0.04;
if (!SRC) { console.error("--src is required"); process.exit(1); }
const OUT_DIR = path.join(OUT, NAME);
fs.mkdirSync(OUT_DIR, { recursive: true });

/* ---------- 1. 读取 16 个单元格（raw RGBA） ---------- */
async function loadCells() {
  const stat = fs.statSync(SRC);
  const srcs = [];
  if (stat.isDirectory()) {
    const files = fs.readdirSync(SRC).filter(f => /\.(png|jpe?g|webp)$/i.test(f)).sort();
    if (files.length !== COLS * ROWS) throw new Error(`need 16 frames, got ${files.length}`);
    files.forEach(f => srcs.push(sharp(path.join(SRC, f))));
  } else {
    const meta = await sharp(SRC).metadata();
    const cw = Math.floor(meta.width / COLS), ch = Math.floor(meta.height / ROWS);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        srcs.push(sharp(SRC).extract({ left: c * cw, top: r * ch, width: cw, height: ch }));
  }
  const cells = [];
  for (const s of srcs) {
    const { data, info } = await s.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    cells.push({ data, w: info.width, h: info.height });
  }
  return cells;
}

/* ---------- 2. 边缘泛洪去背景（内部高光不受影响）+ 羽化 + bbox ---------- */
function keyBackground(cell) {
  const { data, w, h } = cell;
  const corners = [];
  for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
    const at = (px, py) => { const i = (py * w + px) * 4; return [data[i], data[i + 1], data[i + 2]]; };
    corners.push(at(x, y), at(w - 1 - x, y), at(x, h - 1 - y), at(w - 1 - x, h - 1 - y));
  }
  const bg = [0, 1, 2].map(k => corners.reduce((s, c) => s + c[k], 0) / corners.length);
  const diff = new Float32Array(w * h);
  for (let p = 0; p < w * h; p++) {
    const i = p * 4;
    const dr = data[i] - bg[0], dg = data[i + 1] - bg[1], db = data[i + 2] - bg[2];
    diff[p] = Math.sqrt((dr * dr + dg * dg + db * db) / 3);
  }
  const reached = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let qh = 0, qt = 0;
  const push = p => { if (!reached[p] && diff[p] < TOL + FEATHER) { reached[p] = 1; queue[qt++] = p; } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (qh < qt) {
    const p = queue[qh++], x = p % w, y = (p / w) | 0;
    if (x > 0) push(p - 1);
    if (x < w - 1) push(p + 1);
    if (y > 0) push(p - w);
    if (y < h - 1) push(p + w);
  }
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let p = 0; p < w * h; p++) {
    let a = 255;
    if (reached[p]) {
      const t = (diff[p] - TOL) / FEATHER;
      a = t <= 0 ? 0 : t >= 1 ? 255 : Math.round(t * 255);
    }
    data[p * 4 + 3] = a;
    if (a > 8) {
      const x = p % w, y = (p / w) | 0;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return [minX, minY, maxX, maxY];
}

/* ---------- 3. 主流程 ---------- */
const cells = await loadCells();
const bboxes = cells.map(keyBackground);
const uX = Math.min(...bboxes.map(b => b[0]));
const uY = Math.min(...bboxes.map(b => b[1]));
const uW = Math.max(...bboxes.map(b => b[2])) - uX + 1;
const uH = Math.max(...bboxes.map(b => b[3])) - uY + 1;

const scale = Math.min(
  (CANVAS_W * (1 - 2 * MARGIN)) / uW,
  (CANVAS_H * (1 - 2 * MARGIN)) / uH
);
const newW = Math.round(uW * scale), newH = Math.round(uH * scale);
const left = Math.round((CANVAS_W - newW) / 2);
const top  = CANVAS_H - Math.round(CANVAS_H * MARGIN) - newH;   // 底部对齐 = 落地线

for (let i = 0; i < cells.length; i++) {
  const { data, w } = cells[i];
  // 裁到 union bbox（16 帧同坐标 → 转动不抖）
  const cropped = Buffer.alloc(uW * uH * 4);
  for (let y = 0; y < uH; y++) {
    const sRow = ((uY + y) * w + uX) * 4, dRow = y * uW * 4;
    data.copy(cropped, dRow, sRow, sRow + uW * 4);
  }
  const file = path.join(OUT_DIR, `turn-${String(i).padStart(2, "0")}.webp`);
  await sharp(cropped, { raw: { width: uW, height: uH, channels: 4 } })
    .resize(newW, newH, { kernel: "lanczos3" })
    .extend({
      top, left,
      right: CANVAS_W - left - newW,
      bottom: CANVAS_H - top - newH,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .webp({ quality: 82, alphaQuality: 100, effort: 6 })
    .toFile(file);
  console.log("✓", file);
}
console.log(`\nDone: ${cells.length} frames → ${OUT_DIR}`);