const isAllowedMediaUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "bcdn.hakunaymatata.com";
  } catch {
    return false;
  }
};

export default async (request) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(JSON.stringify({ error: "Only GET and HEAD are supported" }), {
      status: 405,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const mediaUrl = new URL(request.url).searchParams.get("url");
  if (!mediaUrl) {
    return new Response(JSON.stringify({ error: "Missing media URL" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  if (!isAllowedMediaUrl(mediaUrl)) {
    return new Response(JSON.stringify({ error: "Unsupported media host" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const upstream = await fetch(mediaUrl, {
    method: request.method,
    headers: {
      ...(request.headers.get("range") ? { range: request.headers.get("range") } : {}),
      ...(request.headers.get("if-range") ? { "if-range": request.headers.get("if-range") } : {}),
      "user-agent": "Ustream/1.0",
      accept: "video/mp4,video/*;q=0.9,*/*;q=0.8",
    },
    redirect: "follow",
  });

  const headers = new Headers({
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "content-type": upstream.headers.get("content-type") || "video/mp4",
    "accept-ranges": upstream.headers.get("accept-ranges") || "bytes",
  });
  for (const name of ["content-length", "content-range", "etag", "last-modified"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }

  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
};
