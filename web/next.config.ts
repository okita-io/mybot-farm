import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  outputFileTracingIncludes: {
    "/*": [
      "./src/data/agency-catalog.generated.json",
      "./src/data/team-catalog.generated.json",
      "./public/packs/agents/**/*.json",
      "./public/packs/teams/**/*.json",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
      {
        protocol: "https",
        hostname: "images.clerk.dev",
      },
    ],
  },
  async headers() {
    const cors = [
      { key: "Access-Control-Allow-Origin", value: "*" },
      { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
      {
        key: "Access-Control-Allow-Headers",
        value:
          "Authorization, Payment-Authorization, Content-Type, X-Api-Key, Accept",
      },
      {
        key: "Access-Control-Expose-Headers",
        value: "WWW-Authenticate, Payment-Receipt",
      },
    ];

    return [
      {
        source: "/api",
        headers: cors,
      },
      {
        source: "/api/stalls/:path*",
        headers: cors,
      },
      {
        source: "/api/packs/:path*",
        headers: cors,
      },
      {
        source: "/api/install-prompt/:path*",
        headers: cors,
      },
      {
        source: "/api/resolve-share",
        headers: cors,
      },
      {
        source: "/api/listings/:path*",
        headers: cors,
      },
      {
        source: "/api/library/:path*",
        headers: cors,
      },
      {
        source: "/paid",
        headers: cors,
      },
      {
        source: "/openapi.json",
        headers: cors,
      },
      {
        source: "/packs/:path*",
        headers: cors,
      },
      {
        source: "/downloads/:path*",
        headers: cors,
      },
      {
        source: "/:path*",
        headers: [{ key: "Permissions-Policy", value: "tools=(self)" }],
      },
    ];
  },
};

export default nextConfig;
