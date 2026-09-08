import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "vault.db");

declare global {
  // eslint-disable-next-line no-var
  var __vaultDb: DatabaseSync | undefined;
}

function createDb(): DatabaseSync {
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS ui_screens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      media_type TEXT NOT NULL CHECK (media_type IN ('image','video')),
      file_path TEXT NOT NULL,
      page_type TEXT NOT NULL,
      layout_pattern TEXT NOT NULL,
      verdict TEXT NOT NULL CHECK (verdict IN ('love','hate')),
      why TEXT NOT NULL,
      snippet TEXT,
      snippet_lang TEXT,
      source_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS ui_screen_tags (
      screen_id INTEGER NOT NULL REFERENCES ui_screens(id) ON DELETE CASCADE,
      tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (screen_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS palettes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS palette_colors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      palette_id INTEGER NOT NULL REFERENCES palettes(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      hex TEXT NOT NULL,
      role TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS fonts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      family_name TEXT NOT NULL,
      weights TEXT NOT NULL,
      file_path TEXT NOT NULL,
      foundry TEXT,
      source_url TEXT,
      licence TEXT NOT NULL CHECK (licence IN ('free','personal only','commercial','unknown')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Extra weight/style files beyond the font's primary (fonts.file_path)
    -- row — a font family upload can carry several variants at once.
    CREATE TABLE IF NOT EXISTS font_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      font_id INTEGER NOT NULL REFERENCES fonts(id) ON DELETE CASCADE,
      file_path TEXT NOT NULL,
      weight_label TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_ui_screens_page_type ON ui_screens(page_type);
    CREATE INDEX IF NOT EXISTS idx_ui_screens_verdict ON ui_screens(verdict);
  `);

  return db;
}

// Reused across hot-reloads in dev so we don't reopen the file on every edit.
export const db = globalThis.__vaultDb ?? createDb();
if (process.env.NODE_ENV !== "production") globalThis.__vaultDb = db;
