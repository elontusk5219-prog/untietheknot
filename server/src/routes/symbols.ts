import { Hono } from "hono";
import { db } from "../db";

const app = new Hono();

app.get("/", (c) => {
  const trackId = Number(c.req.query("track_id") ?? 8);
  const limit = Math.min(Number(c.req.query("limit") ?? 100), 500);
  const offset = Number(c.req.query("offset") ?? 0);

  const rows = db
    .query(
      `SELECT id, svg_path, color, author_name, created_at
       FROM symbols WHERE track_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
    .all(trackId, limit, offset);

  return c.json(rows);
});

app.post("/", async (c) => {
  const body = await c.req.json();
  const { svg_path, color, author_name, track_id } = body;

  if (!svg_path) {
    return c.json({ error: "svg_path required" }, 400);
  }

  if (svg_path.length > 10000) {
    return c.json({ error: "svg_path too large" }, 400);
  }

  const result = db
    .query(
      `INSERT INTO symbols (track_id, svg_path, color, author_name)
       VALUES (?, ?, ?, ?) RETURNING id, created_at`
    )
    .get(
      track_id ?? 8,
      svg_path,
      color ?? "#ffffff",
      author_name ?? null
    ) as { id: number; created_at: string };

  return c.json({ id: result.id, created_at: result.created_at }, 201);
});

export default app;
