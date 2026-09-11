"use client";

import { useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import { Button } from "@/components/ui/button";

async function copyText(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const field = document.createElement("textarea");
  field.value = text;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.left = "-9999px";
  document.body.appendChild(field);
  field.select();
  document.execCommand("copy");
  document.body.removeChild(field);
}

export function CopyInstallPrompt({
  prompt,
  label = "Copy install prompt",
  variant = "outline",
}: {
  prompt: string;
  label?: string;
  variant?: "default" | "outline" | "ghost";
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    await copyText(prompt);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      type="button"
      variant={variant}
      size="lg"
      className="h-9 rounded-full px-4"
      onClick={onCopy}
    >
      {copied ? (
        <Check data-icon="inline-start" />
      ) : (
        <ClipboardCopy data-icon="inline-start" />
      )}
      {copied ? "Copied" : label}
    </Button>
  );
}
