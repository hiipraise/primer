"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowDown, Plus } from "lucide-react";
import { useAuth } from "../components/auth-provider";
import { AuthModal } from "../components/auth-modal";
import { useGenerate } from "../features/generator/use-generate";
import { Onboarding, RefineBar, ResultView, StreamedPreview, VersionHistory } from "../features/generator/components";
import type { GenerationResult, GenerationVersion, PromptFormat } from "../features/generator/types";
import type { RegionPreset } from "@primer/engine";

export default function Home() {
  const { user } = useAuth();
  const { generate, loading, error, setError, streamedSections, streamedContent } = useGenerate();
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [format, setFormat] = useState<PromptFormat>("generic");
  const [region, setRegion] = useState<RegionPreset>("nigeria");
  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [refineDraft, setRefineDraft] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [capReached, setCapReached] = useState<{ used: number; cap: number } | null>(null);
  const [forkIdea, setForkIdea] = useState("");
  useEffect(() => { setForkIdea(new URLSearchParams(window.location.search).get("idea")?.slice(0, 4000) ?? ""); }, []);

  const submit = useCallback(async (input: string, sessionId?: string) => {
    const outcome = await generate({ input, session_id: sessionId, format, region, low_bandwidth: lowBandwidth });
    if (outcome.capped) { setCapReached(outcome.capped); return; }
    if (outcome.result) {
      setResult(outcome.result);
      setRefineDraft("");
      setPublishedUrl(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [format, generate, lowBandwidth, region]);

  const restoreSession = useCallback(async (sessionId: string) => {
    setError(null);
    try {
      const response = await fetch(`/api/generations?session_id=${encodeURIComponent(sessionId)}`);
      if (!response.ok) throw new Error("Session could not be restored.");
      const data = await response.json();
      const latest = data.generations?.[data.generations.length - 1];
      if (!latest) throw new Error("This session has no saved generations.");
      const publicationResponse = await fetch(`/api/generations/${latest.id}/publish`);
      const publication = publicationResponse.ok ? (await publicationResponse.json()).prompt : null;
      setPublishedUrl(publication?.is_public ? `/p/${publication.slug}` : null);
      setResult({
        prompt: latest.output_prompt, generation_id: latest.id, stack: latest.stack ?? [],
        tools: latest.tools ?? [], skills: latest.skills ?? [], session_id: sessionId,
        version_number: latest.version_number, created_at: latest.created_at,
        spec: latest.spec, change_summary: latest.change_summary, format: latest.format,
      });
      setFormat(latest.format ?? "generic");
      setPublishedUrl(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Session could not be restored.");
    }
  }, [setError]);

  const copy = useCallback(async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); window.setTimeout(() => setCopied(null), 1600); }
    catch { setError("Clipboard access is unavailable in this browser."); }
  }, [setError]);

  const publish = useCallback(async (details: { title: string; summary: string; is_public: boolean }) => {
    if (!result?.generation_id) return;
    try {
      const response = await fetch(`/api/generations/${result.generation_id}/publish`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(details) });
      if (!response.ok) { setError("This brief could not be published."); return; }
      const data = await response.json();
      setPublishedUrl(details.is_public ? `/p/${data.prompt.slug}` : null);
    } catch { setError("This brief could not be published."); }
  }, [result, setError]);

  const rename = useCallback(async (title: string) => {
    if (!result) return;
    const response = await fetch(`/api/sessions/${result.session_id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
    if (!response.ok) setError("The session name could not be updated.");
  }, [result, setError]);

  const removeSession = useCallback(async () => {
    if (!result) return;
    const response = await fetch(`/api/sessions/${result.session_id}`, { method: "DELETE" });
    if (!response.ok) { setError("The session could not be deleted."); return; }
    setResult(null); setPublishedUrl(null); setRefineDraft(""); window.scrollTo({ top: 0 });
  }, [result, setError]);

  const refine = useCallback(() => {
    if (refineDraft.trim() && result) void submit(refineDraft.trim(), result.session_id);
  }, [refineDraft, result, submit]);

  const newChat = useCallback(() => {
    setResult(null); setRefineDraft(""); setCopied(null); setPublishedUrl(null); setCapReached(null); setError(null); window.scrollTo({ top: 0 });
  }, [setError]);

  const selectVersion = useCallback((version: GenerationVersion) => {
    setResult({ ...version, prompt: version.output_prompt, format: version.format });
    setFormat(version.format ?? "generic"); setPublishedUrl(null); window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || !result) return;
      if (event.key === "Enter" && refineDraft.trim() && !loading) { event.preventDefault(); refine(); }
      if (event.shiftKey && event.key.toLowerCase() === "c") { event.preventDefault(); void copy(result.prompt, "prompt"); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [copy, loading, refine, refineDraft, result]);

  return <div className="app-shell">
    <header className="site-header"><Link className="brand" href="/" aria-label="Primer home">Primer<span className="brand-mark">.</span></Link><div className="header-actions"><Link className="text-link" href="/developers">API</Link>{result && <button className="button button-secondary" onClick={newChat}><Plus size={15} />New idea</button>}<AuthModal onRestoreSession={restoreSession} /></div></header>
    <main className={`main-content ${result ? "main-result" : ""}`}>
      {capReached ? <section className="cap-card card-surface"><span className="eyebrow">Free plan</span><h1>You’ve used your {capReached.cap} free generations</h1><p>Sign in from the account menu to continue. Your work stays in this browser until you sign in.</p>{user && <button className="button button-secondary" onClick={() => { setCapReached(null); newChat(); }}>Start a new idea</button>}</section> : result ? <>
        {loading && streamedSections.length > 0 && <div className="stream-progress" aria-live="polite">Updating {streamedSections.slice(-3).map((section) => section.replaceAll("_", " ")).join(" · ")}…</div>}
        {loading && <StreamedPreview sections={streamedContent} />}
        {error && <p className="error-message" role="alert">{error}</p>}
        <VersionHistory result={result} onSelect={selectVersion} onRename={rename} onDelete={removeSession} />
        <ResultView result={result} copied={copied} onCopy={copy} publishedUrl={publishedUrl} onPublish={publish} />
        <div className="bottom-scroll"><a href="#refine" aria-label="Go to refine input"><ArrowDown size={17} /></a></div>
        <div id="refine"><RefineBar value={refineDraft} onChange={setRefineDraft} onSubmit={refine} disabled={loading} /></div>
      </> : <>
        {user && <p className="signed-in-note">Signed in · your projects are saved to your account</p>}
        <Onboarding key={forkIdea} initialGoal={forkIdea} format={format} onFormatChange={setFormat} onGenerate={(input) => void submit(input)} disabled={loading} error={error} region={region} onRegionChange={setRegion} lowBandwidth={lowBandwidth} onLowBandwidthChange={setLowBandwidth} />
        {loading && <section className="generation-skeleton" aria-live="polite" aria-busy="true"><div className="skeleton-line wide" /><div className="skeleton-line" /><p>Building sections{streamedSections.length ? ` · ${streamedSections.slice(-2).join(" · ")}` : "…"}</p><div className="skeleton-block" /><StreamedPreview sections={streamedContent} /></section>}
      </>}
    </main>
    <footer className="site-footer">Primer · Think it through, then build.</footer>
  </div>;
}
