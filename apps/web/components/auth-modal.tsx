"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, type User as AuthUser } from "./auth-provider";
import { X, User as UserIcon } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────
interface SessionItem {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ─── Avatar initials ─────────────────────────────────────────────────
function AvatarCircle({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <span
      style={{
        width: "30px",
        height: "30px",
        borderRadius: "50%",
        background: "#2F6F62",
        color: "#DCE9E4",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "12.5px",
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initials}
    </span>
  );
}

// ─── Sign-in card (unauthenticated) ──────────────────────────────────
function SignInCard({
  onSignIn,
  signingIn,
  signInError,
  onClearError,
}: {
  onSignIn: () => void;
  signingIn: boolean;
  signInError: string | null;
  onClearError: () => void;
}) {
  return (
    <div style={{ padding: "22px 18px" }}>
      <div
        style={{
          fontSize: "13.5px",
          color: "#B5AF9E",
          marginBottom: "14px",
          lineHeight: 1.5,
        }}
      >
        Sign in to save your sessions and get unlimited generations.
      </div>

      {signInError && (
        <div
          style={{
            background: "#3D2020",
            border: "1px solid #6B2E2E",
            borderRadius: "6px",
            padding: "10px 12px",
            fontSize: "12.5px",
            color: "#F0B2B2",
            marginBottom: "12px",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <span>{signInError}</span>
          <button
            onClick={onClearError}
            style={{
              background: "transparent",
              border: "none",
              color: "#C96A6A",
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      <button
        onClick={onSignIn}
        disabled={signingIn}
        style={{
          width: "100%",
          background: "#ECE7DC",
          border: "none",
          borderRadius: "6px",
          padding: "10px",
          fontSize: "13.5px",
          fontWeight: 600,
          color: "#211F1C",
          cursor: signingIn ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          opacity: signingIn ? 0.5 : 1,
        }}
      >
        {signingIn ? (
          <>
            <span
              style={{
                width: "14px",
                height: "14px",
                borderRadius: "50%",
                border: "2px solid #6B6656",
                borderTopColor: "#211F1C",
                animation: "spin 0.6s linear infinite",
                display: "inline-block",
              }}
            />
            Redirecting...
          </>
        ) : (
          <>
            <UserIcon size={14} />
            Continue with Google
          </>
        )}
      </button>
    </div>
  );
}

// ─── Profile card (authenticated) ────────────────────────────────────
function ProfileCard({
  user,
  onSignOut,
  onSelectSession,
  signingOut,
}: {
  user: AuthUser;
  onSignOut: () => void;
  onSelectSession: (id: string) => void;
  signingOut: boolean;
}) {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState(false);
  const [pendingClaim, setPendingClaim] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  // Check for claimable sessions on mount
  useEffect(() => {
    fetch("/api/sessions/pending-claim")
      .then((r) => r.json())
      .then((d) => setPendingClaim(d.pending ?? 0))
      .catch(() => {});
  }, []);

  // Fetch sessions
  const loadSessions = useCallback(async (pageNum: number) => {
    setSessionsLoading(true);
    setSessionsError(false);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    try {
      const res = await fetch(`/api/sessions?page=${pageNum}&limit=20`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (pageNum === 1) {
        setSessions(data.sessions ?? []);
      } else {
        setSessions((prev) => [...prev, ...(data.sessions ?? [])]);
      }
      setHasMore(data.has_more ?? false);
      setPage(pageNum);
    } catch {
      setSessionsError(true);
    } finally {
      clearTimeout(timeoutId);
      setSessionsLoading(false);
    }
  }, []);

  // Load first page on mount
  useEffect(() => {
    loadSessions(1);
  }, [loadSessions]);

  const handleClaim = useCallback(async () => {
    setClaiming(true);
    try {
      const res = await fetch("/api/sessions/claim", { method: "POST" });
      const data = await res.json();
      if (data.claimed > 0) {
        setClaimed(true);
        setPendingClaim(0);
        loadSessions(1);
      }
    } catch {
      // silently fail
    } finally {
      setClaiming(false);
    }
  }, [loadSessions]);

  return (
    <>
      {/* Claim banner */}
      {pendingClaim > 0 && !claimed && (
        <div
          style={{
            margin: "12px 18px 12px",
            background: "#1E3A32",
            border: "1px solid #2F6F62",
            borderRadius: "6px",
            padding: "10px 14px",
          }}
        >
          <div style={{ fontSize: "12.5px", color: "#B5E0D4" }}>
            You have {pendingClaim} session
            {pendingClaim !== 1 ? "s" : ""} from before signing in.
          </div>
          <button
            onClick={handleClaim}
            disabled={claiming}
            style={{
              marginTop: "8px",
              background: "#2F6F62",
              border: "none",
              borderRadius: "4px",
              padding: "6px 14px",
              fontSize: "12px",
              fontWeight: 600,
              color: "#EDF3F1",
              cursor: claiming ? "not-allowed" : "pointer",
              opacity: claiming ? 0.6 : 1,
            }}
          >
            {claiming ? "Importing..." : `Import ${pendingClaim}`}
          </button>
        </div>
      )}

      {claimed && (
        <div
          style={{
            margin: "0 18px 12px",
            background: "#1E3A32",
            border: "1px solid #2F6F62",
            borderRadius: "6px",
            padding: "10px 14px",
            fontSize: "12.5px",
            color: "#B5E0D4",
          }}
        >
          Sessions imported successfully.
        </div>
      )}

      {/* Profile header */}
      <div
        style={{
          padding: "14px 18px",
          borderBottom: "1px solid #3A362E",
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={user.name}
            style={{
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              objectFit: "cover",
              flexShrink: 0,
            }}
          />
        ) : (
          <AvatarCircle name={user.name} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "13.5px",
              fontWeight: 500,
              color: "#EDE9DF",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user.name}
          </div>
          {user.email && (
            <div
              style={{
                fontSize: "12px",
                color: "#8A8574",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.email}
            </div>
          )}
        </div>
      </div>

      {/* Sessions list */}
      <div style={{ overflowY: "auto", padding: "8px 0" }}>
        <div
          style={{
            padding: "6px 18px",
            fontSize: "11px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#6B6656",
          }}
        >
          Sessions
        </div>

        {sessions.length === 0 && !sessionsLoading && !sessionsError && (
          <div
            style={{
              padding: "20px 18px",
              fontSize: "12.5px",
              color: "#7C7768",
              textAlign: "center",
            }}
          >
            No sessions yet.
          </div>
        )}

        {sessionsError && !sessionsLoading && (
          <div
            style={{
              padding: "20px 18px",
              fontSize: "12.5px",
              color: "#8A6534",
              textAlign: "center",
            }}
          >
            Could not load sessions.
          </div>
        )}

        {sessions.map((s, i) => (
          <div
            key={s.id}
            onClick={() => onSelectSession(s.id)}
            style={{
              padding: "10px 18px",
              cursor: "pointer",
              borderBottom:
                i < sessions.length - 1 ? "1px solid #35322B" : "none",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#2B2824")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <div
              style={{
                fontSize: "13px",
                color: "#EDE9DF",
                marginBottom: "3px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {s.title ?? "Untitled"}
            </div>
            <div style={{ fontSize: "11.5px", color: "#7C7768" }}>
              {timeAgo(s.updated_at)}
            </div>
          </div>
        ))}

        {sessionsLoading && (
          <div
            style={{
              padding: "12px 18px",
              fontSize: "12px",
              color: "#7C7768",
              textAlign: "center",
            }}
          >
            Loading...
          </div>
        )}

        {hasMore && !sessionsLoading && (
          <div
            onClick={() => loadSessions(page + 1)}
            style={{
              padding: "12px 18px",
              fontSize: "12px",
              color: "#8A8574",
              textAlign: "center",
              cursor: "pointer",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#EDE9DF")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#8A8574")}
          >
            Load more
          </div>
        )}
      </div>

      {/* Sign out */}
      <div style={{ padding: "12px 18px", borderTop: "1px solid #3A362E" }}>
        <button
          onClick={onSignOut}
          disabled={signingOut}
          style={{
            width: "100%",
            background: "transparent",
            border: "1px solid #45413A",
            borderRadius: "6px",
            padding: "8px",
            fontSize: "13px",
            fontWeight: 500,
            color: "#B5AF9E",
            cursor: signingOut ? "not-allowed" : "pointer",
            fontFamily: "'Inter', sans-serif",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            opacity: signingOut ? 0.5 : 1,
            transition: "color 0.15s, border-color 0.15s, opacity 0.15s",
          }}
          onMouseEnter={(e) => {
            if (signingOut) return;
            e.currentTarget.style.color = "#EDE9DF";
            e.currentTarget.style.borderColor = "#6B6656";
          }}
          onMouseLeave={(e) => {
            if (signingOut) return;
            e.currentTarget.style.color = "#B5AF9E";
            e.currentTarget.style.borderColor = "#45413A";
          }}
        >
          {signingOut ? (
            <>
              <span
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  border: "2px solid #6B6656",
                  borderTopColor: "#B5AF9E",
                  animation: "spin 0.6s linear infinite",
                  display: "inline-block",
                }}
              />
              Signing out...
            </>
          ) : (
            "Sign out"
          )}
        </button>
      </div>
    </>
  );
}

// ─── Main auth modal ─────────────────────────────────────────────────
export function AuthModal({
  onRestoreSession,
}: {
  onRestoreSession?: (sessionId: string) => void;
}) {
  const {
    user,
    loading,
    signingIn,
    signInError,
    signIn,
    signOut,
    clearSignInError,
  } = useAuth();
  const [open, setOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    signOut(); // navigates away — no await needed, page will unload
  }, [signOut]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      setOpen(false);
      onRestoreSession?.(sessionId);
    },
    [onRestoreSession],
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={loading}
        style={{
          background: "transparent",
          border: "1px solid #45413A",
          color: "#EDE9DF",
          borderRadius: "3px",
          padding: user ? "6px" : "8px 16px",
          fontSize: "13.5px",
          fontFamily: "'Inter', sans-serif",
          fontWeight: 500,
          cursor: loading ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          opacity: loading ? 0.4 : 1,
        }}
      >
        {loading ? (
          <span
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              border: "2px solid #45413A",
              borderTopColor: "#EDE9DF",
              animation: "spin 0.6s linear infinite",
              display: "inline-block",
            }}
          />
        ) : user ? (
          user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              style={{
                width: "26px",
                height: "26px",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
          ) : (
            <AvatarCircle name={user.name} />
          )
        ) : (
          "Sign in"
        )}
      </button>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,14,12,0.6)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "flex-end",
            padding: "76px 32px",
            zIndex: 50,
          }}
          onClick={() => setOpen(false)}
        >
          <div
            ref={modalRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#2B2824",
              border: "1px solid #3A362E",
              borderRadius: "10px",
              width: "340px",
              maxHeight: "70vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                padding: "16px 18px",
                borderBottom: "1px solid #3A362E",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#B5AF9E",
                }}
              >
                Account
              </span>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "#B5AF9E",
                  padding: 0,
                  display: "flex",
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{ overflowY: "auto", flex: 1 }}>
              {user ? (
                <ProfileCard
                  user={user}
                  onSignOut={handleSignOut}
                  onSelectSession={handleSelectSession}
                  signingOut={signingOut}
                />
              ) : (
                <SignInCard
                  onSignIn={signIn}
                  signingIn={signingIn}
                  signInError={signInError}
                  onClearError={clearSignInError}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
