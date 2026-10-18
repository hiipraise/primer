"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

interface ApiKey { id: string; name: string; key_prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null }

export default function DevelopersPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState("");
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch("/api/v1/keys");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "Could not load API keys.");
    setKeys(data.keys);
  }, []);
  useEffect(() => { void load().catch((cause) => setError(cause instanceof Error ? cause.message : "Could not load API keys.")); }, [load]);
  const create = async () => {
    setBusy(true); setError(null);
    try {
      const response = await fetch("/api/v1/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not create API key.");
      setSecret(data.secret); setName(""); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create API key."); }
    finally { setBusy(false); }
  };
  const revoke = async (id: string) => {
    const response = await fetch("/api/v1/keys?id=" + encodeURIComponent(id), { method: "DELETE" });
    if (!response.ok) { setError("Could not revoke API key."); return; }
    await load();
  };
  return <main className="legal-page"><Link href="/" className="text-link">Back to Primer</Link><header><span className="eyebrow">Developer access</span><h1>Primer API</h1><p>Create a secret key, call the generate endpoint, or use the command line client.</p></header><article>
    <h2>Create an API key</h2><div className="api-key-create"><input className="text-field" value={name} maxLength={60} onChange={(event) => setName(event.target.value)} placeholder="e.g. local prototype" aria-label="API key name" /><button className="button button-primary" onClick={() => void create()} disabled={busy || !name.trim()}>{busy ? "Creating..." : "Create key"}</button></div>
    {secret && <div className="api-secret" role="alert"><strong>Copy this key now. It will only be shown once.</strong><code>{secret}</code><button className="button button-secondary" onClick={() => void navigator.clipboard.writeText(secret)}>Copy key</button><button className="text-button" onClick={() => setSecret(null)}>Dismiss</button></div>}
    {error && <p className="error-message" role="alert">{error} Sign in to create or manage keys.</p>}
    <h2>Your keys</h2>{keys.length ? <ul className="api-key-list">{keys.map((key) => <li key={key.id}><div><strong>{key.name}</strong><code>{key.key_prefix}...</code><small>{key.revoked_at ? "Revoked" : "Created " + new Date(key.created_at).toLocaleDateString()}{key.last_used_at ? " · Last used " + new Date(key.last_used_at).toLocaleDateString() : ""}</small></div>{!key.revoked_at && <button className="button button-secondary" onClick={() => void revoke(key.id)}>Revoke</button>}</li>)}</ul> : <p>No API keys yet.</p>}
    <h2>Command line</h2><pre className="developer-code">PRIMER_API_KEY=pr_live_... primer generate --input "A clinic appointment app" --region nigeria --low-bandwidth</pre><p>Keys are shown once and stored as SHA-256 hashes. Each key has its own rate limit. API calls do not save sessions or generations.</p>
    <h2>HTTP endpoint</h2><pre className="developer-code">POST /api/v1/generate{"\n"}Authorization: Bearer pr_live_...{"\n"}Content-Type: application/json{"\n"}{"{ \"input\": \"Build a clinic app\", \"format\": \"generic\", \"region\": \"nigeria\", \"low_bandwidth\": true }"}</pre>
  </article></main>;
}
