import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import scores from "./routes/scores";
import symbols from "./routes/symbols";

const app = new Hono();

app.use("*", cors());

app.route("/api/scores", scores);
app.route("/api/symbols", symbols);

app.get("/api/health", (c) => c.json({ status: "ok", ts: Date.now() }));

app.use("/*", serveStatic({ root: "./public" }));
app.use("/*", serveStatic({ root: "./public", path: "/index.html" }));

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: app.fetch,
};

console.log(`Server running on http://localhost:${port}`);
