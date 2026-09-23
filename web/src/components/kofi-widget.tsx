"use client";

import Script from "next/script";

const KOFI_USERNAME = "alexokita";

type KofiOverlay = {
  draw: (username: string, options: Record<string, string>) => void;
};

export function KofiWidget() {
  return (
    <Script
      src="https://storage.ko-fi.com/cdn/scripts/overlay-widget.js"
      strategy="afterInteractive"
      onLoad={() => {
        const overlay = (window as Window & { kofiWidgetOverlay?: KofiOverlay })
          .kofiWidgetOverlay;
        overlay?.draw(KOFI_USERNAME, {
          type: "floating-chat",
          "floating-chat.donateButton.text": "Support me",
          "floating-chat.donateButton.background-color": "#00b9fe",
          "floating-chat.donateButton.text-color": "#fff",
        });
      }}
    />
  );
}
