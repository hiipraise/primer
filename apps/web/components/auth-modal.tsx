"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useAuth, type User as AuthUser } from "./auth-provider";
import { X, User as UserIcon } from "lucide-react";

interface SessionItem { id: string; title: string | null; created_at: string; updated_at: string }

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return mins + "m ago";
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + "h ago";
  const days = Math.floor(hrs / 24);
  return days < 30 ? days + "d ago" : new Date(dateStr).toLocaleDateString();
}

function AvatarCircle({ name }: { name: string }) {
  const initials = name.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2);
  return <span className="avatar-initials" aria-hidden="true">{initials}</span>;
}

function Spinner({ small = false }: { small?: boolean }) {
  return <span className={small ? "account-spinner account-spinner-small" : "account-spinner"} aria-hidden="true" />;
}

function SignInCard({ onSignIn, signingIn, signInError, onClearError }: {
  onSignIn: () => void; signingIn: boolean; signInError: string | null; onClearError: () => void;
}) {
  return <div className="sign-in-content">
    <p className="sign-in-intro">Sign in to save your sessions and get unlimited generations.</p>
    {signInError && <div className="account-error" role="alert"><span>{signInError}</span><button type="button" className="account-error-close" onClick={onClearError} aria-label="Dismiss error"><X size={14} /></button></div>}
    <button type="button" className="account-sign-in-button" onClick={onSignIn} disabled={signingIn}>
      {signingIn ? <><Spinner small />Redirecting...</> : <><UserIcon size={14} />Continue with Google</>}
    </button>
  </div>;
}

function ProfileCard({ user, onSignOut, onSelectSession, signingOut }: {
  user: AuthUser; onSignOut: () => void; onSelectSession: (id: string) => void; signingOut: boolean;
}) {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(false);
  const [pendingClaim, setPendingClaim] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    fetch("/api/sessions/pending-claim").then((response) => response.json()).then((data) => setPendingClaim(data.pending ?? 0)).catch(() => {});
  }, []);

  const loadSessions = useCallback(async (pageNum: number) => {
    setSessionsLoading(true); setSessionsError(false);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch("/api/sessions?page=" + pageNum + "&limit=20", { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok) throw new Error("Could not load sessions.");
      setSessions((current) => pageNum === 1 ? data.sessions ?? [] : [...current, ...(data.sessions ?? [])]);
      setHasMore(data.has_more ?? false); setPage(pageNum);
    } catch { setSessionsError(true); }
    finally { clearTimeout(timeoutId); setSessionsLoading(false); }
  }, []);

  useEffect(() => { void loadSessions(1); }, [loadSessions]);

  const handleClaim = useCallback(async () => {
    setClaiming(true);
    try {
      const response = await fetch("/api/sessions/claim", { method: "POST" });
      const data = await response.json();
      if (response.ok && data.claimed > 0) { setClaimed(true); setPendingClaim(0); void loadSessions(1); }
    } catch { /* The banner can be retried after reopening the account menu. */ }
    finally { setClaiming(false); }
  }, [loadSessions]);

  return <>
    {pendingClaim > 0 && !claimed && <div className="account-claim-banner"><p>You have {pendingClaim} session{pendingClaim !== 1 ? "s" : ""} from before signing in.</p><button type="button" className="account-claim-button" onClick={() => void handleClaim()} disabled={claiming}>{claiming ? "Importing..." : "Import " + pendingClaim}</button></div>}
    {claimed && <p className="account-claim-success" role="status">Sessions imported successfully.</p>}
    <div className="account-profile">
      {user.avatar_url ? <Image src={user.avatar_url} alt="" width={30} height={30} unoptimized className="account-profile-avatar" /> : <AvatarCircle name={user.name} />}
      <div className="account-profile-details"><span className="account-profile-name">{user.name}</span>{user.email && <span className="account-profile-email">{user.email}</span>}</div>
    </div>
    <div className="account-session-list"><h2 className="account-section-label">Sessions</h2>
      {sessions.length === 0 && !sessionsLoading && !sessionsError && <p className="account-empty">No sessions yet.</p>}
      {sessionsError && !sessionsLoading && <p className="account-load-error" role="alert">Could not load sessions.</p>}
      {sessions.map((session) => <button type="button" className="account-session" key={session.id} onClick={() => onSelectSession(session.id)}><span className="account-session-title">{session.title ?? "Untitled"}</span><span className="account-session-age">{timeAgo(session.updated_at)}</span></button>)}
      {sessionsLoading && <p className="account-loading" role="status">Loading...</p>}
      {hasMore && !sessionsLoading && <button type="button" className="account-load-more" onClick={() => void loadSessions(page + 1)}>Load more</button>}
    </div>
    <div className="account-signout-footer"><button type="button" className="account-signout-button" onClick={onSignOut} disabled={signingOut}>{signingOut ? <><Spinner small />Signing out...</> : "Sign out"}</button></div>
  </>;
}

export function AuthModal({ onRestoreSession }: { onRestoreSession?: (sessionId: string) => void }) {
  const { user, loading, signingIn, signInError, signIn, signOut, clearSignInError } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = () => modalRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])') ?? [];
    focusable()[0]?.focus();
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items[items.length - 1]?.focus(); }
      else if (!event.shiftKey && document.activeElement === items[items.length - 1]) { event.preventDefault(); items[0]?.focus(); }
    };
    document.addEventListener("keydown", handler);
    return () => { document.removeEventListener("keydown", handler); previouslyFocused?.focus(); };
  }, [open]);

  const handleSignOut = useCallback(() => { setSigningOut(true); signOut(); }, [signOut]);
  const handleSelectSession = useCallback((sessionId: string) => { setOpen(false); onRestoreSession?.(sessionId); }, [onRestoreSession]);

  return <>
    <button type="button" className={user ? "account-trigger account-trigger-user" : "account-trigger"} onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} disabled={loading}>
      {loading ? <Spinner /> : user ? user.avatar_url ? <Image src={user.avatar_url} alt={user.name} width={26} height={26} unoptimized className="account-trigger-avatar" /> : <AvatarCircle name={user.name} /> : "Sign in"}
    </button>
    {open && <div className="account-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section ref={modalRef} className="account-dialog" role="dialog" aria-modal="true" aria-label="Account" tabIndex={-1}>
        <header className="account-dialog-header"><span>Account</span><button type="button" className="account-dialog-close" onClick={() => setOpen(false)} aria-label="Close account dialog"><X size={16} /></button></header>
        <div className="account-dialog-content">{user ? <ProfileCard user={user} onSignOut={handleSignOut} onSelectSession={handleSelectSession} signingOut={signingOut} /> : <SignInCard onSignIn={signIn} signingIn={signingIn} signInError={signInError} onClearError={clearSignInError} />}</div>
      </section>
    </div>}
  </>;
}
