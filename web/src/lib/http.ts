export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
} as const;

export function jsonResponse(data: unknown, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");

  for (const [key, value] of Object.entries(corsHeaders)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }

  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", "public, max-age=60");
  }

  return new Response(JSON.stringify(data, null, 2), {
    ...init,
    headers,
  });
}

export function notFoundResponse(slug?: string) {
  return jsonResponse(
    {
      error: "stall_not_found",
      ...(slug ? { slug } : {}),
    },
    { status: 404 },
  );
}

export function optionsResponse() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}
