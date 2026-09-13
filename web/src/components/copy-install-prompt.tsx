"use client";

import { useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import { Button } from "@/components/ui/button";

async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
  } catch {
    // Fall through to the textarea path when the Clipboard API is blocked.
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.top = "0";
  field.style.left = "0";
  field.style.opacity = "0";
  document.body.appendChild(field);
  field.focus();
  field.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(field);

  if (!copied) {
    throw new Error("copy_failed");
  }
}

export function CopyInstallPrompt({
  prompt,
  label = "Copy install prompt",
  variant = "outline",
  disabled = false,
}: {
  prompt: string;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function onCopy() {
    if (disabled) {
      return;
    }

    try {
      await copyText(prompt);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }

    window.setTimeout(() => setStatus("idle"), 2000);
  }

  const idle = status === "idle";
  const copied = status === "copied";

  return (
    <Button
      type="button"
      variant={variant}
      size="lg"
      className="h-9 rounded-full px-4"
      disabled={disabled}
      title={disabled ? "Buy this stall to unlock" : undefined}
      aria-live="polite"
      onClick={() => {
        void onCopy();
      }}
    >
      {copied ? (
        <Check data-icon="inline-start" />
      ) : (
        <ClipboardCopy data-icon="inline-start" />
      )}
      {idle ? label : copied ? "Copied" : "Select text below"}
    </Button>
  );
}
