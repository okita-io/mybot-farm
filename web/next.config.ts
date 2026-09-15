import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  outputFileTracingIncludes: {
    "/*": [
      "./src/data/agency-catalog.generated.json",
      "./public/packs/agents/**/*.json",
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
      },
    ],
  },
  async headers() {
    const cors = [
      { key: "Access-Control-Allow-Origin", value: "*" },
      { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
      { key: "Access-Control-Allow-Headers", value: "Content-Type" },
    ];

    return [
      {
        source: "/api/:path*",
        headers: cors,
      },
      {
        source: "/packs/:path*",
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
