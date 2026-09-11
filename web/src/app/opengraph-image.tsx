import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = `${site.productName} — ${site.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f4f5f8",
          color: "#2a3144",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", fontSize: 28, fontWeight: 500 }}>
          {site.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              display: "flex",
              fontSize: 72,
              fontWeight: 600,
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
            }}
          >
            {site.tagline}
          </div>
          <div style={{ display: "flex", fontSize: 28, color: "#5a6478", maxWidth: 820 }}>
            {site.description}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
