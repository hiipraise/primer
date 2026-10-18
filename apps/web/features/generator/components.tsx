"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronUp, Copy, Download, FileDown, Pencil, Share2, Trash2, X } from "lucide-react";
import { AdSlot } from "@primer/ads";
import type { FormatterFile, GenerationResult, GenerationVersion, PromptFormat } from "./types";

export function FormatPicker({ value, onChange }: { value: PromptFormat; onChange: (value: PromptFormat) => void }) {
  return <label className="format-picker"><span>Output format</span><select value={value} onChange={(event) => onChange(event.target.value as PromptFormat)}><option value="generic">Product brief</option><option value="claude-code">Claude Code</option><option value="cursor">Cursor</option><option value="v0">v0 UI brief</option><option value="windsurf">Windsurf</option></select></label>;
}

export function Onboarding({ onGenerate, disabled, error, format, onFormatChange, initialGoal = "" }: {
  onGenerate: (input: string) => void; disabled: boolean; error: string | null; format: PromptFormat;
  onFormatChange: (format: PromptFormat) => void; initialGoal?: string;
}) {
  const [goal, setGoal] = useState(initialGoal);
  useEffect(() => { if (initialGoal) setGoal(initialGoal); }, [initialGoal]);
  const [constraints, setConstraints] = useState("");
  const [stage, setStage] = useState("");
  const [showHint, setShowHint] = useState(false);
  const goalRef = useRef<HTMLTextAreaElement>(null);
  const goalSeemsSpecific = goal.trim().length >= 12;
  const submit = () => {
    if (!goal.trim() || disabled) return;
    if (!goalSeemsSpecific) setShowHint(true);
    onGenerate([`Goal: ${goal.trim()}`, constraints.trim() ? `Constraints: ${constraints.trim()}` : "", stage.trim() ? `Stage: ${stage.trim()}` : ""].filter(Boolean).join("\n"));
  };
  return <section className="onboarding card-surface">
    <p className="eyebrow">A clearer start for your next build</p>
    <h1>Prepare the idea before you build it.</h1>
    <p className="lede">Share the goal, any constraints, and where you are today. Primer will shape it into an execution-ready plan.</p>
    <label className="field-label" htmlFor="project-goal">What are you trying to build or achieve?</label>
    <textarea id="project-goal" ref={goalRef} className="text-field goal-field" value={goal} onChange={(event) => setGoal(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); submit(); } }} placeholder="A web app that helps neighborhood clinics coordinate appointments..." maxLength={4000} />
    {!goalSeemsSpecific && goal.trim().length > 0 && <p className="soft-hint">A little more detail can improve the recommendations. You can still continue with this idea.</p>}
    <div className="form-grid">
      <label className="field-label">Constraints <span className="optional">Optional</span><input className="text-field" value={constraints} onChange={(event) => setConstraints(event.target.value)} placeholder="Budget, timeline, preferred tools…" /></label>
      <label className="field-label">Project stage <span className="optional">Optional</span><input className="text-field" value={stage} onChange={(event) => setStage(event.target.value)} placeholder="Idea, prototype, existing product…" /></label>
    </div>
    <FormatPicker value={format} onChange={onFormatChange} />
    {error && <p className="error-message" role="alert">{error}</p>}
    {showHint && <div className="hint-panel" role="status"><span>Your goal is quite short. More detail may help Primer tailor the plan. Generation can continue with the current idea.</span><button className="button button-secondary" onClick={() => { setShowHint(false); goalRef.current?.focus(); }}>Got it</button></div>}
    <button className="button button-primary generate-button" onClick={submit} disabled={disabled || !goal.trim()}>{disabled ? "Preparing your plan…" : "Build my project brief"}<span aria-hidden="true">→</span></button>
    <p className="helper-text">Press Ctrl/⌘ + Enter to generate.</p>
  </section>;
}

function useFocusTrap(open: boolean, onClose: () => void, ref: RefObject<HTMLElement | null>) {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const root = ref.current;
    const focusable = () => root?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [];
    focusable()[0]?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onCloseRef.current(); }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1]?.focus(); }
      else if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0]?.focus(); }
    };
    document.addEventListener("keydown", handler);
    return () => { document.removeEventListener("keydown", handler); previous?.focus(); };
  }, [open, ref]);
}

export function AccessibleDialog({ title, children, onClose, labelledBy }: { title: string; children: ReactNode; onClose: () => void; labelledBy?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(true, onClose, ref);
  return <div className="dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="dialog-card" role="dialog" aria-modal="true" aria-label={labelledBy ? undefined : title} aria-labelledby={labelledBy} ref={ref}><div className="dialog-heading"><h2 id={labelledBy}>{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={17} /></button></div>{children}</section></div>;
}

export function PublishPanel({ result, publishedUrl, onPublish }: { result: GenerationResult; publishedUrl: string | null; onPublish: (details: { title: string; summary: string; is_public: boolean }) => Promise<void> }) {
  const suggestedSummary = typeof result.spec?.summary === "string" ? result.spec.summary : "A project brief with a practical stack and implementation plan.";
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(suggestedSummary.split(/[.!?]/)[0]?.slice(0, 100) || "Project brief");
  const [summary, setSummary] = useState(suggestedSummary.slice(0, 500));
  const [busy, setBusy] = useState(false);
  const publish = async (is_public = true) => { setBusy(true); try { await onPublish({ title, summary, is_public }); setOpen(false); } finally { setBusy(false); } };
  return <><button className="button button-secondary" onClick={() => setOpen(true)} disabled={!result.generation_id}><Share2 size={15} />{publishedUrl ? "Edit publication" : "Share"}</button>{publishedUrl && <Link className="text-link" href={publishedUrl}>Open public page</Link>}{open && <AccessibleDialog title="Share this project brief" onClose={() => setOpen(false)}><p className="dialog-copy">Edit the public title and summary before publishing.</p><label className="field-label">Title<input className="text-field" value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} /></label><label className="field-label">Summary<textarea className="text-field" value={summary} maxLength={500} onChange={(event) => setSummary(event.target.value)} rows={4} /></label><div className="dialog-actions"><button className="button button-secondary" onClick={() => setOpen(false)}>Cancel</button>{publishedUrl && <button className="button button-secondary" onClick={() => void publish(false)} disabled={busy}>{busy ? "Saving?" : "Unpublish"}</button>}<button className="button button-primary" onClick={() => void publish()} disabled={busy || !title.trim() || !summary.trim()}>{busy ? "Publishing?" : publishedUrl ? "Save changes" : "Publish brief"}</button></div></AccessibleDialog>}</>;
}
function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
  return (crc ^ 0xffffffff) >>> 0;
}
function makeZip(files: FormatterFile[]) {
  const encoder = new TextEncoder();
  const locals: Uint8Array[] = []; const centrals: Uint8Array[] = []; let offset = 0;
  const put16 = (v: DataView, at: number, n: number) => v.setUint16(at, n, true);
  const put32 = (v: DataView, at: number, n: number) => v.setUint32(at, n, true);
  for (const file of files) {
    const name = encoder.encode(file.path); const data = encoder.encode(file.content); const crc = crc32(data);
    const local = new Uint8Array(30 + name.length + data.length); const lv = new DataView(local.buffer);
    put32(lv, 0, 0x04034b50); put16(lv, 4, 20); put16(lv, 6, 0x0800); put16(lv, 8, 0); put32(lv, 14, crc); put32(lv, 18, data.length); put32(lv, 22, data.length); put16(lv, 26, name.length); local.set(name, 30); local.set(data, 30 + name.length); locals.push(local);
    const central = new Uint8Array(46 + name.length); const cv = new DataView(central.buffer);
    put32(cv, 0, 0x02014b50); put16(cv, 4, 20); put16(cv, 6, 20); put16(cv, 8, 0x0800); put16(cv, 10, 0); put32(cv, 16, crc); put32(cv, 20, data.length); put32(cv, 24, data.length); put16(cv, 28, name.length); put32(cv, 42, offset); central.set(name, 46); centrals.push(central); offset += local.length;
  }
  const centralSize = centrals.reduce((n, chunk) => n + chunk.length, 0); const end = new Uint8Array(22); const ev = new DataView(end.buffer); put32(ev, 0, 0x06054b50); put16(ev, 8, files.length); put16(ev, 10, files.length); put32(ev, 12, centralSize); put32(ev, 16, offset);
  const chunks = [...locals, ...centrals, end];
  const archive = new Uint8Array(chunks.reduce((size, chunk) => size + chunk.byteLength, 0));
  let cursor = 0;
  for (const chunk of chunks) { archive.set(chunk, cursor); cursor += chunk.byteLength; }
  return new Blob([archive.buffer], { type: "application/zip" });
}

export function ResultView({ result, copied, onCopy, publishedUrl, onPublish }: { result: GenerationResult; copied: string | null; onCopy: (text: string, key: string) => void; publishedUrl: string | null; onPublish: (details: { title: string; summary: string; is_public: boolean }) => Promise<void> }) {
  const [expanded, setExpanded] = useState(true);
  const files = result.files ?? [];
  const downloadZip = () => { const url = URL.createObjectURL(makeZip(files)); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "primer-project-files.zip"; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 30_000); };
  return <div className="result-view">
    {result.change_summary && result.version_number > 1 && <div className="change-note"><strong>What changed</strong><p>{result.change_summary}</p></div>}
    <section className="prompt-card"><header className="panel-heading"><div><span className="eyebrow">Your project brief</span><small>{result.version_number > 1 ? `Version ${result.version_number}` : "Ready to use"}</small></div><button className="button button-secondary" onClick={() => onCopy(result.prompt, "prompt")}>{copied === "prompt" ? <Check size={15} /> : <Copy size={15} />}{copied === "prompt" ? "Copied" : "Copy brief"}</button></header><pre className="prompt-content">{result.prompt}</pre></section>
    <section className="recommendation-card"><button className="section-toggle" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}><span><span className="eyebrow">Project recommendations</span><strong>Stack, tools and skills</strong></span>{expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>{expanded && <div className="recommendation-grid">{([["Stack", result.stack], ["Tools", result.tools], ["Skills", result.skills]] as const).map(([title, items]) => <div className="recommendation-group" key={title}><h3>{title}</h3>{items.length ? items.map((item) => <article className="recommendation-item" key={item.name}><strong>{item.name}</strong><p>{item.reason}</p></article>) : <p className="muted">No recommendations in this section.</p>}</div>)}</div>}</section>
    {files.length > 0 && <section className="files-card"><header className="panel-heading"><div><span className="eyebrow">Formatted project files</span><small>{files.length} file{files.length === 1 ? "" : "s"}</small></div><button className="button button-secondary" onClick={downloadZip}><Download size={15} />Download .zip</button></header>{files.map((file) => <details className="file-entry" key={file.path}><summary><FileDown size={15} />{file.path}</summary><button className="text-button file-copy" onClick={() => onCopy(file.content, file.path)}>{copied === file.path ? "Copied" : "Copy file"}</button><pre>{file.content}</pre></details>)}</section>}
    <div className="result-actions"><button className="button button-secondary" onClick={() => onCopy([result.prompt, ...files.map((file) => file.content)].join("\n\n"), "all")}>{copied === "all" ? <Check size={15} /> : <Copy size={15} />}{copied === "all" ? "Copied all" : "Copy all"}</button><PublishPanel result={result} publishedUrl={publishedUrl} onPublish={onPublish} /></div>
    <AdSlot position="generation-result" />
  </div>;
}

export function RefineBar({ value, onChange, onSubmit, disabled }: { value: string; onChange: (value: string) => void; onSubmit: () => void; disabled: boolean }) {
  return <div className="refine-dock"><div className="refine-inner"><textarea aria-label="Refine the project brief" value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); onSubmit(); } }} placeholder="Ask for a change: make it mobile-first, reduce the launch scope…" disabled={disabled} rows={2} /><button className="button button-primary" onClick={onSubmit} disabled={disabled || !value.trim()}>{disabled ? "Updating…" : "Refine"}<span aria-hidden="true">→</span></button></div><small>Ctrl/⌘ + Enter to refine · Ctrl/⌘ + Shift + C to copy</small></div>;
}

export function VersionHistory({ result, onSelect, onRename, onDelete }: { result: GenerationResult; onSelect: (version: GenerationVersion) => void; onRename: (title: string) => Promise<void>; onDelete: () => Promise<void> }) {
  const [versions, setVersions] = useState<GenerationVersion[]>([]);
  const [compare, setCompare] = useState<GenerationVersion | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionTitle, setSessionTitle] = useState("");
  useEffect(() => { let active = true; fetch(`/api/generations?session_id=${encodeURIComponent(result.session_id)}`).then((res) => res.ok ? res.json() : Promise.reject()).then((data) => { if (active) { setVersions(data.generations ?? []); setSessionTitle(data.session_title ?? ""); } }).catch(() => {}); return () => { active = false; }; }, [result.session_id, result.version_number]);
  const sorted = useMemo(() => [...versions].sort((a, b) => a.version_number - b.version_number), [versions]);
  return <section className="history-card"><div className="section-heading"><div><span className="eyebrow">Session history</span><h2>Versions</h2></div><div className="history-actions"><button className="icon-button" title="Rename session" aria-label="Rename session" onClick={() => { setTitle(""); setRenameOpen(true); }}><Pencil size={15} /></button><button className="icon-button danger" title="Delete session" aria-label="Delete session" onClick={() => setDeleteOpen(true)}><Trash2 size={15} /></button></div></div>
    {sessionTitle && <p className="session-title">{sessionTitle}</p>}
    {sorted.length > 1 ? <div className="version-list">{sorted.map((version) => <div className="version-row" key={version.id}><button className={`version-select ${version.version_number === result.version_number ? "is-current" : ""}`} onClick={() => onSelect(version)}><span>Version {version.version_number}{version.version_number === result.version_number ? " · Current" : ""}</span><small>{version.change_summary ?? version.user_input}</small></button>{version.version_number < result.version_number && <button className="text-button" onClick={() => setCompare(version)}>Compare</button>}</div>)}</div> : <p className="muted">Refine this brief to create a version history.</p>}
    {compare && <AccessibleDialog title={`Compare version ${compare.version_number} with ${result.version_number}`} onClose={() => setCompare(null)}><div className="diff-grid"><article><h3>Version {compare.version_number}</h3><pre>{compare.output_prompt ?? compare.prompt}</pre></article><article><h3>Version {result.version_number}</h3><pre>{result.prompt}</pre></article></div></AccessibleDialog>}
    {renameOpen && <AccessibleDialog title="Rename this session" onClose={() => setRenameOpen(false)}><label className="field-label">Session name<input className="text-field" autoFocus maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="A short name for this project" /></label><div className="dialog-actions"><button className="button button-secondary" onClick={() => setRenameOpen(false)}>Cancel</button><button className="button button-primary" disabled={!title.trim() || busy} onClick={async () => { setBusy(true); await onRename(title.trim()); setSessionTitle(title.trim()); setBusy(false); setRenameOpen(false); }}>Save name</button></div></AccessibleDialog>}
    {deleteOpen && <AccessibleDialog title="Delete this session?" onClose={() => setDeleteOpen(false)}><p className="dialog-copy">This removes the session and its generation history permanently.</p><div className="dialog-actions"><button className="button button-secondary" onClick={() => setDeleteOpen(false)}>Keep session</button><button className="button button-danger" disabled={busy} onClick={async () => { setBusy(true); await onDelete(); setBusy(false); }}>Delete session</button></div></AccessibleDialog>}
  </section>;
}
