"use client";

import { useState } from "react";
import { Button } from "./button";

/**
 * Copies text to the clipboard, confirming inline. Falls back to a hidden
 * textarea + execCommand: the Clipboard API needs a secure context, and this
 * button is the whole paste-through flow — it can't quietly do nothing.
 */
export function CopyButton({
  text,
  label = "Copy prompt",
  onCopied,
}: {
  text: string;
  label?: string;
  onCopied?: () => void;
}) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = legacyCopy(text);
    }
    setState(ok ? "copied" : "failed");
    if (ok) onCopied?.();
    window.setTimeout(() => setState("idle"), 2500);
  }

  return (
    <div className="flex items-center gap-3">
      <Button type="button" variant="ghost" onClick={copy}>
        {state === "copied" ? "Copied" : label}
      </Button>
      {state === "failed" ? (
        <span className="text-xs text-negative" role="alert">
          Couldn&apos;t copy — select the text below and copy it manually.
        </span>
      ) : null}
    </div>
  );
}

function legacyCopy(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(area);
  return ok;
}
