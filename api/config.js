// Public capability status only: never return any private API key or token.
import { applyCors, getServerCapabilities } from "../lib/http-utils.js";

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

  const capabilities = getServerCapabilities();
  if (method === "HEAD") return res.status(200).end();
  return res.status(200).json(capabilities);
}
