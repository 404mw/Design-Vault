"use client";

import { useEffect, useRef, useState } from "react";
import { Pill } from "./Pill";
import {
  extractDominantColours,
  samplePixelColour,
  sampleRectDominantColour,
} from "@/lib/extractColours";
import { MAX_PALETTE_COLOURS } from "@/lib/constants";

type Rect = { left: number; top: number; width: number; height: number };
type Loupe = {
  screenX: number;
  screenY: number;
  hex: string;
  bgSize: { w: number; h: number };
  bgPos: { x: number; y: number };
};

// Mirrors the --size-loupe token in globals.css (7rem = 112px at the
// default 16px root font-size) — the magnifier's background-position math
// needs a px value, which CSS custom properties can't give JS directly.
const LOUPE_SIZE = 112;
const LOUPE_ZOOM = 4;

/**
 * The screen add/edit form's "Colours" section: auto-extracts 5 dominant
 * colours from the specimen image on load, then lets the user remove any of
 * them or add more from an enlarged preview — either by pressing and
 * dragging to sample a single pixel through a magnifier loupe ("pick"
 * mode), or by dragging a rectangle whose dominant colour gets added
 * ("select" mode). Colours ride along as repeated `palette_hex` hidden
 * inputs plus a `save_palette` checkbox, both read by the server action
 * (see src/lib/palettes.ts). Only rendered for image specimens — videos get
 * no colour UI.
 */
export function ColourPicker({
  imageSrc,
  colours,
  onColoursChange,
  savePalette,
  onSavePaletteChange,
}: {
  imageSrc: string;
  colours: string[];
  onColoursChange: (hexes: string[]) => void;
  savePalette: boolean;
  onSavePaletteChange: (checked: boolean) => void;
}) {
  const [mode, setMode] = useState<"pick" | "select">("pick");
  const [rect, setRect] = useState<Rect | null>(null);
  const [loupe, setLoupe] = useState<Loupe | null>(null);

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const extractedForRef = useRef<string | null>(null);

  // Re-extract whenever the underlying image changes (new upload, or a
  // replacement on the edit form) — not on every re-render.
  useEffect(() => {
    extractedForRef.current = null;
  }, [imageSrc]);

  function handleImageLoad() {
    if (extractedForRef.current === imageSrc) return;
    extractedForRef.current = imageSrc;
    if (!imgRef.current) return;
    try {
      onColoursChange(extractDominantColours(imgRef.current, 5).slice(0, MAX_PALETTE_COLOURS));
    } catch {
      // Canvas came back tainted (shouldn't happen — same-origin or
      // proxied) — leave colours empty rather than throw.
    }
  }

  const atMaxColours = colours.length >= MAX_PALETTE_COLOURS;

  function addColour(hex: string) {
    if (atMaxColours) return;
    if (!colours.some((c) => c.toLowerCase() === hex.toLowerCase())) {
      onColoursChange([...colours, hex.toUpperCase()]);
    }
  }

  function removeColour(hex: string) {
    onColoursChange(colours.filter((c) => c !== hex));
  }

  function updateLoupe(clientX: number, clientY: number, containerRect: DOMRect) {
    const img = imgRef.current;
    if (!img) return;
    const imgRect = img.getBoundingClientRect();
    const relX = Math.min(Math.max(clientX - imgRect.left, 0), imgRect.width - 1);
    const relY = Math.min(Math.max(clientY - imgRect.top, 0), imgRect.height - 1);
    const scaleX = img.naturalWidth / imgRect.width;
    const scaleY = img.naturalHeight / imgRect.height;
    const px = Math.round(relX * scaleX);
    const py = Math.round(relY * scaleY);

    let hex = "#000000";
    try {
      hex = samplePixelColour(img, px, py);
    } catch {
      // tainted canvas — leave the placeholder
    }

    setLoupe({
      screenX: clientX - containerRect.left,
      screenY: clientY - containerRect.top,
      hex,
      bgSize: { w: imgRect.width * LOUPE_ZOOM, h: imgRect.height * LOUPE_ZOOM },
      bgPos: { x: relX * LOUPE_ZOOM - LOUPE_SIZE / 2, y: relY * LOUPE_ZOOM - LOUPE_SIZE / 2 },
    });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (atMaxColours || !containerRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const containerRect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;
    dragStartRef.current = { x, y };

    if (mode === "select") {
      setRect({ left: x, top: y, width: 0, height: 0 });
    } else {
      updateLoupe(e.clientX, e.clientY, containerRect);
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragStartRef.current || !containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();

    if (mode === "select") {
      const x = e.clientX - containerRect.left;
      const y = e.clientY - containerRect.top;
      const { x: startX, y: startY } = dragStartRef.current;
      setRect({
        left: Math.min(startX, x),
        top: Math.min(startY, y),
        width: Math.abs(x - startX),
        height: Math.abs(y - startY),
      });
    } else {
      updateLoupe(e.clientX, e.clientY, containerRect);
    }
  }

  function handlePointerUp() {
    const img = imgRef.current;
    const containerRect = containerRef.current?.getBoundingClientRect();

    if (mode === "select" && rect && img && containerRect) {
      const imgRect = img.getBoundingClientRect();
      const scaleX = img.naturalWidth / imgRect.width;
      const scaleY = img.naturalHeight / imgRect.height;
      const offsetX = imgRect.left - containerRect.left;
      const offsetY = imgRect.top - containerRect.top;

      const x = Math.max(0, Math.round((rect.left - offsetX) * scaleX));
      const y = Math.max(0, Math.round((rect.top - offsetY) * scaleY));
      const width = Math.max(1, Math.round(rect.width * scaleX));
      const height = Math.max(1, Math.round(rect.height * scaleY));

      if (rect.width > 2 && rect.height > 2) {
        try {
          addColour(sampleRectDominantColour(img, { x, y, width, height }));
        } catch {
          // tainted canvas — nothing to add
        }
      }
      setRect(null);
    } else if (mode === "pick" && loupe) {
      addColour(loupe.hex);
      setLoupe(null);
    }

    dragStartRef.current = null;
  }

  function handlePointerCancel() {
    dragStartRef.current = null;
    setRect(null);
    setLoupe(null);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {colours.length === 0 && (
          <p className="text-xs text-ink-faint">No colours yet — extracting…</p>
        )}
        {colours.map((hex) => (
          <span
            key={hex}
            className="inline-flex items-center gap-1.5 border border-line bg-paper-raised py-1 pl-1 pr-2"
          >
            <span
              className="h-5 w-5 border border-line-strong"
              style={{ backgroundColor: hex }}
              aria-hidden
            />
            <span className="catalog-number text-3xs text-ink-soft">{hex}</span>
            <button
              type="button"
              onClick={() => removeColour(hex)}
              aria-label={`Remove ${hex}`}
              className="text-ink-faint hover:text-accent"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="flex gap-1.5">
        <Pill
          as="button"
          active={mode === "pick"}
          disabled={atMaxColours}
          onClick={() => setMode("pick")}
        >
          Pick colour
        </Pill>
        <Pill
          as="button"
          active={mode === "select"}
          disabled={atMaxColours}
          onClick={() => setMode("select")}
        >
          Select area
        </Pill>
      </div>
      {atMaxColours && (
        <p className="text-xs text-ink-faint">
          A palette can have at most {MAX_PALETTE_COLOURS} colours — remove one to add another.
        </p>
      )}

      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="relative touch-none select-none overflow-hidden border border-line"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={imageSrc}
          onLoad={handleImageLoad}
          alt="Specimen preview for colour picking"
          draggable={false}
          className="block w-full"
        />

        {rect && (
          <div
            className="pointer-events-none absolute border-2 border-accent bg-accent/10"
            style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }}
          />
        )}

        {loupe && (
          <div
            className="loupe-position loupe-size pointer-events-none absolute overflow-hidden rounded-full border-2 border-accent bg-paper-deep"
            style={{
              left: loupe.screenX,
              top: loupe.screenY,
              backgroundImage: `url(${imageSrc})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: `${loupe.bgSize.w}px ${loupe.bgSize.h}px`,
              backgroundPosition: `-${loupe.bgPos.x}px -${loupe.bgPos.y}px`,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-2 w-2 border border-ink" style={{ backgroundColor: loupe.hex }} />
            </div>
          </div>
        )}
      </div>

      <p className="catalog-label text-2xs text-ink-soft">
        {mode === "pick"
          ? "Press and drag on the image, release to add that colour."
          : "Drag a rectangle to add its dominant colour."}
      </p>

      <label className="flex items-center gap-2 text-xs text-ink-soft">
        <input
          type="checkbox"
          checked={savePalette}
          onChange={(e) => onSavePaletteChange(e.target.checked)}
        />
        Save colours as palette
      </label>
      {savePalette && colours.length < 2 && (
        <p className="text-xs text-accent">
          Add at least 2 colours to save them as a palette, or uncheck the box above.
        </p>
      )}

      {colours.map((hex) => (
        <input key={`hidden-${hex}`} type="hidden" name="palette_hex" value={hex} />
      ))}
      <input type="hidden" name="save_palette" value={savePalette ? "on" : ""} />
    </div>
  );
}
