// Health check endpoint — Vercel serverless function.
import { applyCors } from "../lib/http-utils.js";

export default function handler(req, res) {
  applyCors(req, res, {
    methods: "GET, HEAD, OPTIONS",
    headers: "Content-Type, Accept",
  });
  res.setHeader("Cache-Control", "no-store");

  const method = String(req.method || "GET").toUpperCase();
  if (method === "OPTIONS") return res.status(204).end();
  if (method !== "GET" && method !== "HEAD") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  if (method === "HEAD") return res.status(200).end();
  return res.status(200).json({
    ok: true,
    status: "healthy",
    service: "ustream",
    timestamp: new Date().toISOString(),
  });
}
