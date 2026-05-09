import { db } from "./db";

db.exec(`
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    track_id INTEGER NOT NULL DEFAULT 6,
    score INTEGER NOT NULL,
    max_combo INTEGER NOT NULL DEFAULT 0,
    accuracy REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_scores_track_score
    ON scores (track_id, score DESC);

  CREATE TABLE IF NOT EXISTS symbols (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_id INTEGER NOT NULL DEFAULT 8,
    svg_path TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#ffffff',
    author_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_symbols_track_created
    ON symbols (track_id, created_at DESC);
`);

console.log("Migration complete.");
