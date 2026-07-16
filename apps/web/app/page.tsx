"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../components/auth-provider";
import { AuthModal } from "../components/auth-modal";
import {
  ArrowRight,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Plus,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────
interface SwatchItem {
  name: string;
  reason?: string;
  note?: string;
}

interface ResultData {
  prompt: string;
  stack: SwatchItem[];
  tools: SwatchItem[];
  skills: SwatchItem[];
  session_id: string;
  version_number: number;
  created_at?: string;
}

type PagePhase =
  | { phase: "onboarding" }
  | { phase: "newChat" }
  | { phase: "generating" }
  | { phase: "result"; result: ResultData }
  | { phase: "capped"; used: number; cap: number };

// ─── Onboarding coats ────────────────────────────────────────────────
interface Coat {
  key: "goal" | "constraints" | "stage";
  label: string;
  prompt: string;
  hint: string;
  placeholder: string;
}

const COATS: Coat[] = [
  {
    key: "goal",
    label: "First coat",
    prompt: "What are you trying to build or achieve?",
    hint: "Be as specific as you can. The more detail you give, the better the output.",
    placeholder:
      "A PWA for Nigerian youth to practice job interviews with AI-generated questions...",
  },
  {
    key: "constraints",
    label: "Second coat",
    prompt: "Any constraints?",
    hint: "Budget, timeline, tech preferences, or must-have features. If none, just type none.",
    placeholder:
      "No budget for paid tools, must work on low-end Android phones...",
  },
  {
    key: "stage",
    label: "Third coat",
    prompt: "What stage are you at?",
    hint: "This helps Primer tailor the prompt to where you actually are.",
    placeholder: "Just an idea — haven't written any code yet.",
  },
];

type Answers = Record<Coat["key"], string>;

// ─── Recommendation group ────────────────────────────────────────────
function RecommendGroup({
  title,
  items,
  tone,
}: {
  title: string;
  items: SwatchItem[];
  tone: "teal" | "gold";
}) {
  const dotColors = {
    teal: { bg: "#DCE9E4", fg: "#1F4A40", border: "#B7D2C8" },
    gold: { bg: "#F2E4C4", fg: "#6B4B12", border: "#E0C688" },
  };
  const dot = dotColors[tone];

  return (
    <div style={{ marginBottom: "16px" }}>
      <div
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.08em",
          color: "#8A8574",
          textTransform: "uppercase",
          marginBottom: "8px",
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "20px",
                height: "20px",
                borderRadius: "50%",
                background: dot.bg,
                border: `1px solid ${dot.border}`,
                color: dot.fg,
                fontSize: "10px",
                fontWeight: 600,
                fontFamily: "'Inter', sans-serif",
                flexShrink: 0,
                marginTop: "1px",
              }}
            >
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#211F1C",
                  fontFamily: "'Inter', sans-serif",
                  marginBottom: "2px",
                }}
              >
                {it.name}
              </div>
              <div
                style={{
                  fontSize: "12.5px",
                  color: "#6B6656",
                  fontFamily: "'Inter', sans-serif",
                  lineHeight: 1.5,
                }}
              >
                {it.note ?? it.reason ?? ""}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────
export default function Home() {
  const { user, loading: authLoading, signIn } = useAuth();
  const authCheckDone = useRef(false);
  const [phase, setPhase] = useState<PagePhase>({ phase: "onboarding" });
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    goal: "",
    constraints: "",
    stage: "",
  });
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultData | null>(null);
  const [recoOpen, setRecoOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [refineDraft, setRefineDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const newChatInputRef = useRef<HTMLTextAreaElement>(null);
  const refineInputRef = useRef<HTMLTextAreaElement>(null);

  // ── Auto-resize textarea to fit content ────────────────────────
  const autoResize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  // Recalculate height when refineDraft changes (covers suggestion chips & clears)
  useEffect(() => {
    if (newChatInputRef.current) autoResize(newChatInputRef.current);
    if (refineInputRef.current) autoResize(refineInputRef.current);
  }, [refineDraft]);

  const coat = COATS[step];

  // ── Submit a coat (onboarding step) ──────────────────────────────
  const submitCoat = useCallback(() => {
    if (!draft.trim()) return;
    const next: Answers = { ...answers, [coat.key]: draft.trim() };
    setAnswers(next);
    setDraft("");

    if (step < COATS.length - 1) {
      setStep((s) => s + 1);
    } else {
      // Last coat — call the API
      setLoading(true);
      setPhase({ phase: "generating" });
      setError(null);

      const input = [
        `Goal: ${next.goal}`,
        next.constraints && next.constraints.toLowerCase() !== "none"
          ? `Constraints: ${next.constraints}`
          : null,
        `Stage: ${next.stage}`,
      ]
        .filter(Boolean)
        .join("\n");

      fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
      })
        .then(async (res) => {
          const data = await res.json();

          if (res.status === 403 && data.error === "anon_cap_reached") {
            setPhase({
              phase: "capped",
              used: data.used ?? 0,
              cap: data.cap ?? 3,
            });
            return;
          }

          if (!res.ok) {
            throw new Error(data.error ?? "Generation failed");
          }

          const r: ResultData = {
            prompt: data.prompt,
            stack: data.stack ?? [],
            tools: data.tools ?? [],
            skills: data.skills ?? [],
            session_id: data.session_id,
            version_number: data.version_number ?? 1,
            created_at: data.created_at,
          };
          setResult(r);
          setPhase({ phase: "result", result: r });
        })
        .catch((err) => {
          const msg =
            err instanceof Error ? err.message : "Generation failed";
          setError(msg);
          setPhase({ phase: "onboarding" });
        })
        .finally(() => setLoading(false));
    }
  }, [draft, coat, answers, step]);

  // ── Copy prompt ──────────────────────────────────────────────────
  const handleCopy = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result.prompt).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [result]);

  // ── Copy full result ─────────────────────────────────────────────
  const handleCopyFull = useCallback(() => {
    if (!result) return;
    const sections: string[] = ["=== PROMPT ===\n" + result.prompt];
    const formatItems = (items: SwatchItem[]) =>
      items.map((it, i) => `${i + 1}. ${it.name} — ${it.note ?? it.reason ?? ""}`).join("\n");
    if (result.stack.length > 0) {
      sections.push("\n=== RECOMMENDED STACK ===\n" + formatItems(result.stack));
    }
    if (result.tools.length > 0) {
      sections.push("\n=== RECOMMENDED TOOLS ===\n" + formatItems(result.tools));
    }
    if (result.skills.length > 0) {
      sections.push("\n=== RECOMMENDED SKILLS ===\n" + formatItems(result.skills));
    }
    navigator.clipboard.writeText(sections.join("\n\n")).catch(() => {});
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1800);
  }, [result]);

  // ── Scroll to bottom ─────────────────────────────────────────────
  const handleScrollToBottom = useCallback(() => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }, []);

  // ── Track scroll position ────────────────────────────────────────
  // Button should be visible while the user is still near the TOP of the
  // result (so they know a refine input exists further down), and should
  // disappear once they've scrolled down toward it/reached the bottom —
  // there's no point offering to scroll to the bottom when already there.
  useEffect(() => {
    const onScroll = () => {
      const nearTopThreshold = 150;
      setShowScrollBtn(window.scrollY < nearTopThreshold);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // set initial state
    return () => window.removeEventListener("scroll", onScroll);
  }, [phase]);

  // ── Refine ───────────────────────────────────────────────────────
  const submitRefine = useCallback(() => {
    if (!refineDraft.trim() || !result) return;
    setLoading(true);
    setError(null);

    fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: refineDraft.trim(),
        session_id: result.session_id,
      }),
    })
      .then(async (res) => {
        const data = await res.json();

        if (res.status === 403 && data.error === "anon_cap_reached") {
          setPhase({
            phase: "capped",
            used: data.used ?? 0,
            cap: data.cap ?? 3,
          });
          return;
        }

        if (!res.ok) {
          throw new Error(data.error ?? "Refinement failed");
        }

        const r: ResultData = {
          prompt: data.prompt,
          stack: data.stack ?? [],
          tools: data.tools ?? [],
          skills: data.skills ?? [],
          session_id: data.session_id,
          version_number: data.version_number ?? 1,
          created_at: data.created_at,
        };
        setResult(r);
        setPhase({ phase: "result", result: r });
      })
      .catch((err) => {
        const msg =
          err instanceof Error ? err.message : "Refinement failed";
        setError(msg);
        // Keep showing the previous result
        if (result) setPhase({ phase: "result", result });
      })
      .finally(() => {
        setLoading(false);
        setRefineDraft("");
      });
  }, [refineDraft, result]);

  // ── Submit from newChat (no session_id — creates new session) ──
  const submitNewChat = useCallback(() => {
    if (!refineDraft.trim()) return;
    setLoading(true);
    setError(null);
    // Keep phase as newChat while loading — no loading screen interruption

    fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: refineDraft.trim() }),
    })
      .then(async (res) => {
        const data = await res.json();

        if (res.status === 403 && data.error === "anon_cap_reached") {
          setPhase({
            phase: "capped",
            used: data.used ?? 0,
            cap: data.cap ?? 3,
          });
          return;
        }

        if (!res.ok) {
          throw new Error(data.error ?? "Generation failed");
        }

        const r: ResultData = {
          prompt: data.prompt,
          stack: data.stack ?? [],
          tools: data.tools ?? [],
          skills: data.skills ?? [],
          session_id: data.session_id,
          version_number: data.version_number ?? 1,
          created_at: data.created_at,
        };
        setResult(r);
        setPhase({ phase: "result", result: r });
      })
      .catch((err) => {
        const msg =
          err instanceof Error ? err.message : "Generation failed";
        setError(msg);
        setPhase(user ? { phase: "newChat" } : { phase: "onboarding" });
      })
      .finally(() => {
        setLoading(false);
        setRefineDraft("");
      });
  }, [refineDraft, user]);

  // ── After auth loads, set the right initial phase ───────────────
  useEffect(() => {
    if (!authLoading && !authCheckDone.current) {
      authCheckDone.current = true;
      if (user && phase.phase === "onboarding") {
        setPhase({ phase: "newChat" });
      }
    }
  }, [authLoading, user, phase]);

  // ── New chat — clear everything and go back to start ───────────
  const handleNewChat = useCallback(() => {
    setResult(null);
    setPhase(user ? { phase: "newChat" } : { phase: "onboarding" });
    setStep(0);
    setAnswers({ goal: "", constraints: "", stage: "" });
    setDraft("");
    setRefineDraft("");
    setError(null);
    setLoading(false);
    window.scrollTo({ top: 0 });
  }, [user]);

  // ── Restore a session from the auth modal ────────────────────────
  const handleRestoreSession = useCallback(async (sessionId: string) => {
    setError(null);
    try {
      // Fetch all generations — the list already contains every field we need
      const listRes = await fetch(
        `/api/generations?session_id=${encodeURIComponent(sessionId)}`
      );
      if (!listRes.ok) throw new Error("Session not found");
      const listData = await listRes.json();
      const latestVersion =
        (listData.latest_version as number) ??
        (listData.generations?.length as number) ??
        1;
      const latest = listData.generations?.[listData.generations.length - 1];

      if (!latest) throw new Error("No generations found");

      const r: ResultData = {
        prompt: latest.output_prompt,
        stack: latest.stack ?? [],
        tools: latest.tools ?? [],
        skills: latest.skills ?? [],
        session_id: sessionId,
        version_number: latest.version_number ?? latestVersion,
        created_at: latest.created_at,
      };
      setResult(r);
      setPhase({ phase: "result", result: r });
    } catch {
      setError("Could not restore session.");
    }
  }, []);

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#211F1C",
        fontFamily: "'Inter', sans-serif",
        color: "#EDE9DF",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;600&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        input::placeholder, textarea::placeholder { color: #A39C89; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 640px) {
          .app-header { padding: 12px 16px !important; }
          .app-main { padding-left: 16px !important; padding-right: 16px !important; }
        }
      `}</style>

      {/* Header */}
      <header
        className="app-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 32px",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 15,
          background: "transparent",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <span
            style={{
              fontFamily: "'Bricolage Grotesque', serif",
              fontWeight: 600,
              fontSize: "20px",
              letterSpacing: "-0.01em",
            }}
          >
            Primer
          </span>
          <button
            onClick={handleNewChat}
            style={{
              background: "transparent",
              border: "1px solid #3A362E",
              color: "#B5AF9E",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "12px",
              fontWeight: 500,
              fontFamily: "'Inter', sans-serif",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              opacity: 0.7,
              transition: "opacity 0.15s, color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.color = "#EDE9DF";
              e.currentTarget.style.borderColor = "#6B6656";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.7";
              e.currentTarget.style.color = "#B5AF9E";
              e.currentTarget.style.borderColor = "#3A362E";
            }}
          >
            <Plus size={12} />
            New
          </button>
        </div>
        <AuthModal onRestoreSession={handleRestoreSession} />
      </header>

      {/* Main */}
      <main
        className="app-main"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: undefined,
          padding: phase.phase === "result" ? "64px 20px 0" : "64px 20px 80px",
        }}
      >
        {/* Error banner */}
        {error && (
          <div
            style={{
              marginBottom: "20px",
              maxWidth: "560px",
              width: "100%",
              background: "#3D2020",
              border: "1px solid #6B2E2E",
              borderRadius: "8px",
              padding: "12px 16px",
              fontSize: "13.5px",
              color: "#F0B2B2",
              fontFamily: "'Inter', sans-serif",
            }}
          >
            {error}
          </div>
        )}

        {/* ── Non-result phases: all content wrapped together for safe centering ── */}
        {phase.phase !== "result" && (
          <div
            style={{
              width: "100%",
              maxWidth: "560px",
              margin: "auto",
              padding: "64px 0 80px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "36px",
            }}
          >
            {/* Hero text — only for non-auth users on onboarding */}
            {phase.phase === "onboarding" && !user && (
              <div style={{ textAlign: "center", maxWidth: "520px" }}>
                <div
                  style={{
                    fontFamily: "'Bricolage Grotesque', serif",
                    fontWeight: 600,
                    fontSize: "30px",
                    letterSpacing: "-0.015em",
                    lineHeight: 1.25,
                    marginBottom: "10px",
                  }}
                >
                  Prep the idea before you build it.
                </div>
                <div
                  style={{
                    color: "#B5AF9E",
                    fontSize: "15px",
                    lineHeight: 1.6,
                  }}
                >
                  Three short questions, then a stack, the tools worth
                  using, and a prompt ready to paste anywhere.
                </div>
              </div>
            )}

            {/* ── New chat — for authenticated users, no active result ── */}
            {phase.phase === "newChat" && (
              <div style={{ textAlign: "center", maxWidth: "560px", width: "100%" }}>
                <div
                  style={{
                    fontFamily: "'Bricolage Grotesque', serif",
                    fontWeight: 600,
                    fontSize: "28px",
                    letterSpacing: "-0.015em",
                    lineHeight: 1.25,
                    marginBottom: "10px",
                  }}
                >
                  What are you building?
                </div>
                <div
                  style={{
                    color: "#B5AF9E",
                    fontSize: "15px",
                    lineHeight: 1.6,
                    marginBottom: "28px",
                  }}
                >
                  Describe your idea. Primer hands you the stack, the tools,
                  and a ready-to-paste prompt.
                </div>
                <div
                  style={{
                    background: "#2B2824",
                    border: "1px solid #3A362E",
                    borderRadius: "10px",
                    padding: "14px 16px",
                  }}
                >
                  <textarea
                    ref={newChatInputRef}
                    value={refineDraft}
                    onChange={(e) => {
                      setRefineDraft(e.target.value);
                      autoResize(e.target);
                    }}
                    placeholder={
                      'e.g. "A PWA for Nigerian youth to practice job interviews with AI-generated questions..."'
                    }
                    rows={4}
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "#EDE9DF",
                      fontSize: "14px",
                      fontFamily: "'Inter', sans-serif",
                      resize: "none",
                      overflow: "hidden",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submitNewChat();
                      }
                    }}
                  />
                </div>
                <div
                  style={{
                    marginTop: "14px",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    onClick={submitNewChat}
                    disabled={!refineDraft.trim() || loading}
                    style={{
                      background:
                        refineDraft.trim() && !loading ? "#2F6F62" : "#3A362E",
                      color: "#EDF3F1",
                      border: "none",
                      borderRadius: "6px",
                      padding: "10px 22px",
                      fontSize: "13.5px",
                      fontWeight: 600,
                      fontFamily: "'Inter', sans-serif",
                      cursor:
                        refineDraft.trim() && !loading ? "pointer" : "default",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      opacity:
                        refineDraft.trim() && !loading ? 1 : 0.6,
                    }}
                  >
                    {loading ? (
                      <span
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          border: "2px solid #6B6656",
                          borderTopColor: "#EDF3F1",
                          animation: "spin 0.6s linear infinite",
                          display: "inline-block",
                        }}
                      />
                    ) : (
                      <>
                        Generate <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>

                {/* Suggestion chips */}
                <div style={{ marginTop: "36px" }}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#6B6656",
                      marginBottom: "12px",
                    }}
                  >
                    Try an example
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {[
                      "Build a habit tracker app with streaks, reminders, and weekly insights",
                      "Create a SaaS for freelancers to manage invoices, clients, and payments",
                      "Design a real-time multiplayer quiz game for mobile browsers",
                      "Build an AI writing assistant that helps with blog posts and social media",
                    ].map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => setRefineDraft(suggestion)}
                        style={{
                          width: "100%",
                          background: "transparent",
                          border: "1px solid #3A362E",
                          borderRadius: "8px",
                          padding: "12px 16px",
                          color: "#B5AF9E",
                          fontSize: "13px",
                          fontFamily: "'Inter', sans-serif",
                          lineHeight: 1.5,
                          cursor: "pointer",
                          textAlign: "left",
                          transition:
                            "border-color 0.15s, color 0.15s, background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#6B6656";
                          e.currentTarget.style.color = "#EDE9DF";
                          e.currentTarget.style.background = "#2B2824";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#3A362E";
                          e.currentTarget.style.color = "#B5AF9E";
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Loading (only for generating phase — no interruption for newChat) ── */}
            {loading && phase.phase === "generating" && (
              <div
                style={{
                  background: "#ECE7DC",
                  borderRadius: "10px",
                  padding: "40px",
                  textAlign: "center",
                  color: "#6B6656",
                  width: "100%",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "13.5px",
                }}
              >
                {result ? "refining..." : "mixing the coat..."}
              </div>
            )}

            {/* ── Onboarding coats (non-auth only) ─────────── */}
            {phase.phase === "onboarding" && !loading && !user && (
              <div
                style={{
                  background: "#ECE7DC",
                  borderRadius: "10px",
                  overflow: "hidden",
                  width: "100%",
                }}
              >
                {/* Progress strip */}
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    padding: "14px 20px 0",
                  }}
                >
                  {COATS.map((c, i) => (
                    <div
                      key={c.key}
                      style={{
                        height: "4px",
                        flex: 1,
                        borderRadius: "2px",
                        background: i <= step ? "#2F6F62" : "#D5CFBE",
                      }}
                    />
                  ))}
                </div>

                <div style={{ padding: "22px 24px 24px" }}>
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#C08A2E",
                      marginBottom: "10px",
                    }}
                  >
                    {coat.label} — {step + 1} of 3
                  </div>
                  <div
                    style={{
                      fontFamily: "'Bricolage Grotesque', serif",
                      fontWeight: 600,
                      fontSize: "19px",
                      color: "#211F1C",
                      marginBottom: "6px",
                    }}
                  >
                    {coat.prompt}
                  </div>
                  <div
                    style={{
                      fontSize: "13.5px",
                      color: "#6B6656",
                      marginBottom: "16px",
                      lineHeight: 1.5,
                    }}
                  >
                    {coat.hint}
                  </div>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={coat.placeholder}
                    rows={3}
                    style={{
                      width: "100%",
                      background: "#FFFFFF",
                      border: "1px solid #D5CFBE",
                      borderRadius: "6px",
                      padding: "12px 14px",
                      fontSize: "14.5px",
                      fontFamily: "'Inter', sans-serif",
                      color: "#211F1C",
                      resize: "none",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submitCoat();
                      }
                    }}
                  />
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: "14px",
                    }}
                  >
                    <button
                      onClick={submitCoat}
                      style={{
                        background: "#2F6F62",
                        color: "#EDF3F1",
                        border: "none",
                        borderRadius: "6px",
                        padding: "9px 18px",
                        fontSize: "13.5px",
                        fontWeight: 600,
                        fontFamily: "'Inter', sans-serif",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      {step < 2 ? "Next coat" : "Generate"}{" "}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Capped (sign-up gate) ────────────────────── */}
            {phase.phase === "capped" && (
              <div
                style={{
                  background: "#ECE7DC",
                  borderRadius: "10px",
                  padding: "32px 28px",
                  textAlign: "center",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Bricolage Grotesque', serif",
                    fontWeight: 600,
                    fontSize: "20px",
                    color: "#211F1C",
                    marginBottom: "8px",
                  }}
                >
                  Free limit reached
                </div>
                <p
                  style={{
                    fontSize: "13.5px",
                    color: "#6B6656",
                    lineHeight: 1.6,
                    marginBottom: "20px",
                  }}
                >
                  You&apos;ve used all {phase.cap} free generations. Sign
                  in with Google to get unlimited access and save your
                  sessions permanently.
                </p>
                <button
                  onClick={signIn}
                  style={{
                    background: "#211F1C",
                    color: "#EDE9DF",
                    border: "none",
                    borderRadius: "6px",
                    padding: "10px 24px",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    fontFamily: "'Inter', sans-serif",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </button>
                <p
                  style={{
                    marginTop: "14px",
                    fontSize: "12px",
                    color: "#8A8574",
                  }}
                >
                  Your {phase.used} existing generations will be available
                  after signing in.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Result phase content (scrolls with page) ── */}
        {phase.phase === "result" && result && (
          <div
            key={result.version_number + result.session_id}
            style={{
              width: "100%",
              maxWidth: "560px",
              padding: "40px 20px 150px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              animation: "fadeInUp 0.4s ease-out",
            }}
          >
            {/* Prompt card */}
            <div
              style={{
                background: "#211F1C",
                border: "1px solid #3A362E",
                borderRadius: "10px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 18px",
                  borderBottom: "1px solid #3A362E",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#C08A2E",
                  }}
                >
                  Your prompt
                </span>
                <button
                  onClick={handleCopy}
                  style={{
                    background: "transparent",
                    border: "1px solid #45413A",
                    color: "#EDE9DF",
                    borderRadius: "4px",
                    padding: "5px 10px",
                    fontSize: "12px",
                    fontWeight: 500,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: "18px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: "12.5px",
                  lineHeight: 1.65,
                  color: "#EDE9DF",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {result.prompt}
              </pre>
            </div>

            {/* Recommendation panel */}
            {(result.stack.length > 0 ||
              result.tools.length > 0 ||
              result.skills.length > 0) && (
              <div
                style={{
                  background: "#ECE7DC",
                  borderRadius: "10px",
                  padding: "18px 20px",
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => setRecoOpen(!recoOpen)}
                  style={{
                    width: "100%",
                    background: "transparent",
                    border: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    padding: 0,
                    marginBottom: recoOpen ? "16px" : 0,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Bricolage Grotesque', serif",
                      fontWeight: 600,
                      fontSize: "15.5px",
                      color: "#211F1C",
                    }}
                  >
                    Recommended for this
                  </span>
                  {recoOpen ? (
                    <ChevronUp size={16} color="#6B6656" />
                  ) : (
                    <ChevronDown size={16} color="#6B6656" />
                  )}
                </button>
                {recoOpen && (
                  <div>
                    {result.stack.length > 0 && (
                      <RecommendGroup
                        title="Stack"
                        items={result.stack}
                        tone="teal"
                      />
                    )}
                    {result.tools.length > 0 && (
                      <RecommendGroup
                        title="Tools"
                        items={result.tools}
                        tone="gold"
                      />
                    )}
                    {result.skills.length > 0 && (
                      <RecommendGroup
                        title="Skills to use"
                        items={result.skills}
                        tone="teal"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Copy all button at bottom */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              <button
                onClick={handleCopyFull}
                style={{
                  background: "transparent",
                  border: "1px solid #45413A",
                  color: copiedAll ? "#2F6F62" : "#B5AF9E",
                  borderRadius: "8px",
                  padding: "10px 20px",
                  fontSize: "13px",
                  fontWeight: 500,
                  fontFamily: "'Inter', sans-serif",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) =>
                  !copiedAll &&
                  (e.currentTarget.style.color = "#EDE9DF")
                }
                onMouseLeave={(e) =>
                  !copiedAll &&
                  (e.currentTarget.style.color = "#B5AF9E")
                }
              >
                {copiedAll ? <Check size={15} /> : <Copy size={15} />}
                {copiedAll ? "Copied full result" : "Copy full result"}
              </button>
            </div>
          </div>
        )}

        {/* Scroll-to-bottom floating button — lives outside the scrolling
            result block so its fixed position isn't affected by content
            height, and only mounts during the result phase. */}
        {phase.phase === "result" && result && showScrollBtn && (
          <button
            onClick={handleScrollToBottom}
            style={{
              position: "fixed",
              bottom: "100px",
              right: "max(20px, calc((100vw - 560px) / 2 - 52px))",
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              background: "#2F6F62",
              border: "1px solid #3A8A7A",
              color: "#EDF3F1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              zIndex: 12,
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              opacity: 0.85,
              animation: "fadeInUp 0.3s ease-out",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.85")}
            title="Scroll to refine input"
          >
            <ArrowDown size={18} />
          </button>
        )}
      </main>

      {/* ── Fixed bottom refine input (outside main, viewport-positioned) ── */}
      {phase.phase === "result" && result && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 20,
            pointerEvents: "none",
          }}
        >
          {/* Gradient fade from page bg to solid */}
          <div
            style={{
              height: "40px",
              background:
                "linear-gradient(to top, #211F1C 40%, transparent)",
            }}
          />
          <div
            style={{
              background: "#211F1C",
              padding: "0 20px 20px",
              pointerEvents: "auto",
            }}
          >
            <div style={{ maxWidth: "560px", margin: "0 auto" }}>
              <div
                style={{
                  background: "#2B2824",
                  border: "1px solid #3A362E",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  display: "flex",
                  gap: "10px",
                  alignItems: "flex-end",
                }}
              >
                <textarea
                  ref={refineInputRef}
                  value={refineDraft}
                  onChange={(e) => {
                    setRefineDraft(e.target.value);
                    autoResize(e.target);
                  }}
                  placeholder="Refine this — e.g. make it mobile-first, swap the backend..."
                  disabled={loading}
                  rows={1}
                  style={{
                    flex: 1,
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    color: loading ? "#6B6656" : "#EDE9DF",
                    fontSize: "14px",
                    fontFamily: "'Inter', sans-serif",
                    resize: "none",
                    overflowY: "auto",
                    maxHeight: "120px",
                    lineHeight: 1.5,
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !loading) {
                      e.preventDefault();
                      submitRefine();
                    }
                  }}
                />
                {loading ? (
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        border: "2px solid #3A362E",
                        borderTopColor: "#2F6F62",
                        animation: "spin 0.7s linear infinite",
                      }}
                    />
                  </div>
                ) : (
                  <button
                    onClick={submitRefine}
                    disabled={!refineDraft.trim()}
                    style={{
                      background:
                        refineDraft.trim() ? "#2F6F62" : "#3A362E",
                      border: "none",
                      borderRadius: "6px",
                      width: "32px",
                      height: "32px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor:
                        refineDraft.trim() ? "pointer" : "default",
                      flexShrink: 0,
                      opacity:
                        refineDraft.trim() ? 1 : 0.4,
                    }}
                  >
                    <ArrowRight size={15} color="#EDF3F1" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
