"use client";

import { useState } from "react";

export function ReportPrompt({ slug }: { slug: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const report = async () => {
    setBusy(true);
    try {
      const response = await fetch(`/api/public-prompts/${encodeURIComponent(slug)}/report`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      setMessage(response.ok ? "Report sent. Thanks for helping keep the library useful." : "This prompt could not be reported.");
    } catch { setMessage("This prompt could not be reported."); }
    finally { setBusy(false); }
  };
  return <span><button type="button" onClick={() => void report()} disabled={busy}>{busy ? "Sending?" : "Report prompt"}</button>{message && <small role="status"> {message}</small>}</span>;
}
