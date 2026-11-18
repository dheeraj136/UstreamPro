export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const id = req.query?.id || (typeof req.url === "string" ? new URL(req.url, "http://localhost").searchParams.get("id") : "");
  if (!id) {
    return res.status(400).json({ error: "Missing id parameter" });
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const upstreamRes = await fetch(`https://gaiaflix.xyz/api/gaiaflix-movie-source?id=${encodeURIComponent(id)}`, {
      signal: controller.signal,
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    clearTimeout(timer);

    if (!upstreamRes.ok) {
      return res.status(upstreamRes.status).json({ error: `Upstream error ${upstreamRes.status}` });
    }

    const data = await upstreamRes.json();
    const sourceUrl = data?.sources?.[0]?.url;
    let streamUrl = "";
    if (sourceUrl) {
      let base64Part = "";
      if (sourceUrl.includes("?id=")) base64Part = sourceUrl.split("?id=")[1];
      else if (sourceUrl.includes("&id=")) base64Part = sourceUrl.split("&id=")[1];
      else base64Part = sourceUrl;
      if (base64Part.includes("&")) base64Part = base64Part.split("&")[0];

      try {
        const decoded = Buffer.from(base64Part, "base64").toString("utf-8");
        if (decoded && (decoded.startsWith("http://") || decoded.startsWith("https://"))) {
          streamUrl = decoded;
        }
      } catch {}
    }

    return res.status(200).json({
      ...data,
      streamUrl
    });
  } catch (err) {
    return res.status(502).json({ error: err.message || "Upstream fetch failed" });
  }
}
