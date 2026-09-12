"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const themes = ["system", "light", "dark"] as const;

type ThemeChoice = (typeof themes)[number];

function isThemeChoice(value: string | undefined): value is ThemeChoice {
  return value === "system" || value === "light" || value === "dark";
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const current: ThemeChoice =
    mounted && isThemeChoice(theme) ? theme : "system";
  const Icon = current === "dark" ? Moon : current === "light" ? Sun : Monitor;
  const label =
    current === "dark"
      ? "Dark theme. Switch to system."
      : current === "light"
        ? "Light theme. Switch to dark."
        : "System theme. Switch to light.";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={() => {
        const next = themes[(themes.indexOf(current) + 1) % themes.length];
        setTheme(next);
      }}
    >
      <Icon aria-hidden="true" />
    </Button>
  );
}
