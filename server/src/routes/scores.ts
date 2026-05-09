import { Hono } from "hono";
import { db } from "../db";

const app = new Hono();

app.get("/", (c) => {
  const trackId = Number(c.req.query("track_id") ?? 6);
  const limit = Math.min(Number(c.req.query("limit") ?? 50), 100);

  const rows = db
    .query(
      `SELECT id, player_name, score, max_combo, accuracy, created_at
       FROM scores WHERE track_id = ? ORDER BY score DESC LIMIT ?`
    )
    .all(trackId, limit);

  return c.json(rows);
});

app.post("/", async (c) => {
  const body = await c.req.json();
  const { player_name, score, max_combo, accuracy, track_id } = body;

  if (!player_name || score == null) {
    return c.json({ error: "player_name and score required" }, 400);
  }

  const result = db
    .query(
      `INSERT INTO scores (player_name, track_id, score, max_combo, accuracy)
       VALUES (?, ?, ?, ?, ?) RETURNING id, created_at`
    )
    .get(
      player_name,
      track_id ?? 6,
      score,
      max_combo ?? 0,
      accuracy ?? 0
    ) as { id: number; created_at: string };

  return c.json({ id: result.id, created_at: result.created_at }, 201);
});

export default app;
