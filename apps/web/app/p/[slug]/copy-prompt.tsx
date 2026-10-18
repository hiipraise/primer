"use client";

import { useState } from "react";

export function CopyPrompt({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      className="copy-public-prompt"
      onClick={() => {
        navigator.clipboard.writeText(prompt).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? "Copied" : "Copy prompt"}
    </button>
  );
}
