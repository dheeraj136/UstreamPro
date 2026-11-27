// Top-level Vercel Serverless Function router for /api/auth/*, /api/profiles/*,
// /api/profile/*, and /api/videos* (explicitly targeted by vercel.json rewrites).
import { handler as apiRouter } from "../lib/server.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  return await apiRouter(req, res);
}
