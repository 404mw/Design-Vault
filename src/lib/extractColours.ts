// Client-side dominant-colour extraction for the screen add/edit form's
// colour picker. No dependency: downsamples via canvas, then quantizes with
// a hand-written median-cut (recursively splits the widest-range colour box
// on its median channel until there are enough boxes, then averages each
// into a swatch), and dedupes near-identical results by Euclidean RGB
// distance. Runs entirely against an already-loaded <img> element — the
// caller is responsible for making sure it's not CORS-tainted (same-origin
// upload, or proxied via /api/image-proxy for a dragged remote URL).

export type RGB = [number, number, number];

export const HEX_COLOUR_RE = /^#[0-9a-fA-F]{6}$/;

function rgbToHex([r, g, b]: RGB): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`.toUpperCase();
}

type Rect = { x: number; y: number; width: number; height: number };

/**
 * Draws an image (or a sub-rectangle of it) onto an offscreen canvas,
 * downsampled to at most `maxDim` on its longest side, and reads back the
 * raw pixel bytes.
 */
function getPixelData(
  img: HTMLImageElement,
  rect?: Rect,
  maxDim = 100,
): { data: Uint8ClampedArray } {
  const rx = rect?.x ?? 0;
  const ry = rect?.y ?? 0;
  const rw = rect?.width ?? img.naturalWidth;
  const rh = rect?.height ?? img.naturalHeight;

  const scale = Math.min(1, maxDim / Math.max(rw, rh, 1));
  const width = Math.max(1, Math.round(rw * scale));
  const height = Math.max(1, Math.round(rh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable.");
  ctx.drawImage(img, rx, ry, rw, rh, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);
  return { data };
}

function pixelsFromImageData(data: Uint8ClampedArray): RGB[] {
  const pixels: RGB[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // skip mostly-transparent pixels
    pixels.push([data[i], data[i + 1], data[i + 2]]);
  }
  return pixels;
}

function channelRange(box: RGB[], channel: 0 | 1 | 2): number {
  let min = 255;
  let max = 0;
  for (const p of box) {
    if (p[channel] < min) min = p[channel];
    if (p[channel] > max) max = p[channel];
  }
  return max - min;
}

function widestChannel(box: RGB[]): 0 | 1 | 2 {
  const ranges: [number, 0 | 1 | 2][] = [
    [channelRange(box, 0), 0],
    [channelRange(box, 1), 1],
    [channelRange(box, 2), 2],
  ];
  ranges.sort((a, b) => b[0] - a[0]);
  return ranges[0][1];
}

function averageColour(box: RGB[]): RGB {
  let r = 0;
  let g = 0;
  let b = 0;
  for (const p of box) {
    r += p[0];
    g += p[1];
    b += p[2];
  }
  const n = box.length || 1;
  return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
}

/** Median-cut quantization: splits the widest-range box on its median channel until `k` boxes exist (or no box can be split further), then averages each. */
function medianCut(pixels: RGB[], k: number): { colour: RGB; weight: number }[] {
  if (pixels.length === 0) return [];
  const boxes: RGB[][] = [pixels];

  while (boxes.length < k) {
    boxes.sort((a, b) => channelRange(b, widestChannel(b)) - channelRange(a, widestChannel(a)));
    const box = boxes[0];
    if (!box || box.length < 2 || channelRange(box, widestChannel(box)) === 0) break;
    boxes.shift();

    const channel = widestChannel(box);
    const sorted = [...box].sort((a, b) => a[channel] - b[channel]);
    const mid = Math.floor(sorted.length / 2);
    boxes.push(sorted.slice(0, mid), sorted.slice(mid));
  }

  return boxes.map((box) => ({ colour: averageColour(box), weight: box.length }));
}

function colourDistance(a: RGB, b: RGB): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

/** Drops colours that are near-duplicates (Euclidean RGB distance under `threshold`) of one already kept, preferring the earlier (more prominent) one. */
function dedupe(colours: RGB[], threshold = 24): RGB[] {
  const kept: RGB[] = [];
  for (const c of colours) {
    if (!kept.some((k) => colourDistance(k, c) < threshold)) kept.push(c);
  }
  return kept;
}

/** Extracts up to `count` dominant, deduped colours from an already-loaded image, ordered most-to-least prominent. */
export function extractDominantColours(img: HTMLImageElement, count = 5): string[] {
  const { data } = getPixelData(img);
  const pixels = pixelsFromImageData(data);
  if (pixels.length === 0) return [];

  const boxes = medianCut(pixels, count * 3)
    .sort((a, b) => b.weight - a.weight)
    .map((b) => b.colour);

  return dedupe(boxes).slice(0, count).map(rgbToHex);
}

/** Reads a single pixel's colour at natural-image coordinates. */
export function samplePixelColour(img: HTMLImageElement, x: number, y: number): string {
  const { data } = getPixelData(img, { x, y, width: 1, height: 1 }, 1);
  return rgbToHex([data[0], data[1], data[2]]);
}

/** Computes the single dominant colour within a rectangle of an image, in natural-image coordinates. */
export function sampleRectDominantColour(img: HTMLImageElement, rect: Rect): string {
  const { data } = getPixelData(img, rect);
  const pixels = pixelsFromImageData(data);
  if (pixels.length === 0) return "#000000";
  const [dominant] = medianCut(pixels, 1);
  return dominant ? rgbToHex(dominant.colour) : "#000000";
}
