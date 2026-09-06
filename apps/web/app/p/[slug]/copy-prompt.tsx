"use client";

import { useState } from "react";

export function CopyPrompt({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(prompt).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      style={{
        background: "#2F6F62",
        color: "#EDF3F1",
        border: 0,
        borderRadius: 6,
        padding: "9px 14px",
        cursor: "pointer",
      }}
    >
      {copied ? "Copied" : "Copy prompt"}
    </button>
  );
}
