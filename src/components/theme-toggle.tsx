"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem("tmos-theme", dark ? "dark" : "light");
  } catch {
    // localStorage unavailable (private mode) — theme still toggles for the session
  }
  listeners.forEach((listener) => listener());
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );

  return (
    <button
      type="button"
      onClick={() => setTheme(!isDark)}
      aria-label="Toggle dark mode"
      className="rounded-full border border-border-subtle bg-surface px-3 py-1.5 text-sm text-muted transition-colors hover:text-foreground"
    >
      {isDark ? "Light" : "Dark"}
    </button>
  );
}
