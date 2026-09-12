import { site } from "@/lib/site";

export function appOrigin(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) {
    return configured;
  }

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") ?? "http";
    return `${proto}://${host}`;
  }

  return site.url;
}

export function randomLetters(length = 8) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  return Array.from(
    { length },
    () => alphabet[Math.floor(Math.random() * alphabet.length)],
  ).join("");
}
