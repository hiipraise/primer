"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";

export type ConsentChoice = "accepted" | "rejected";
type ConsentContextValue = { choice: ConsentChoice | null; openSettings: () => void; reportException: (error: Error) => void };
const ConsentContext = createContext<ConsentContextValue>({ choice: null, openSettings: () => undefined, reportException: () => undefined });

export function useConsent() { return useContext(ConsentContext); }

function saveChoice(choice: ConsentChoice) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `primer_consent=${choice}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export function ConsentProvider({ initialChoice, children }: { initialChoice: ConsentChoice | null; children: ReactNode }) {
  const [choice, setChoice] = useState<ConsentChoice | null>(initialChoice);
  const [settingsOpen, setSettingsOpen] = useState(initialChoice === null);
  const sentryRef = useRef<typeof import("@sentry/browser") | null>(null);
  const choose = useCallback((next: ConsentChoice) => {
    saveChoice(next);
    if (choice === "accepted" && next === "rejected") {
      window.location.reload();
      return;
    }
    setChoice(next);
    setSettingsOpen(false);
  }, [choice]);
  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const reportException = useCallback((error: Error) => {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    if (choice !== "accepted" || !dsn) return;
    if (sentryRef.current) { sentryRef.current.captureException(error); return; }
    void import("@sentry/browser").then((sdk) => {
      if (!sdk.isInitialized()) sdk.init({ dsn, beforeSend: (event) => { delete event.user; return event; }, tracesSampleRate: 0, environment: process.env.NODE_ENV });
      sentryRef.current = sdk;
      sdk.captureException(error);
    }).catch((cause: unknown) => console.error("[telemetry] Sentry could not report the error", cause));
  }, [choice]);
  const context = useMemo(() => ({ choice, openSettings, reportException }), [choice, openSettings, reportException]);

  useEffect(() => {
    if (choice !== "accepted") return;
    const token = process.env.NEXT_PUBLIC_CLOUDFLARE_BEACON_TOKEN;
    let analyticsScript: HTMLScriptElement | null = null;
    if (token && !document.querySelector("script[data-primer-analytics]")) {
      analyticsScript = document.createElement("script");
      analyticsScript.src = "https://static.cloudflareinsights.com/beacon.min.js";
      analyticsScript.defer = true;
      analyticsScript.dataset.primerAnalytics = "true";
      analyticsScript.dataset.cfBeacon = JSON.stringify({ token });
      document.body.appendChild(analyticsScript);
    }

    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    let active = true;
    let sentry: typeof import("@sentry/browser") | null = null;
    if (dsn) {
      void import("@sentry/browser").then((sdk) => {
        if (!active) return;
        sentry = sdk;
        sentryRef.current = sdk;
        sdk.init({ dsn, beforeSend: (event) => { delete event.user; return event; }, tracesSampleRate: 0, environment: process.env.NODE_ENV });
      }).catch((error: unknown) => console.error("[telemetry] Sentry could not initialize", error));
    }
    return () => {
      active = false;
      analyticsScript?.remove();
      sentryRef.current = null;
      if (sentry) void sentry.close(0);
    };
  }, [choice]);

  return <ConsentContext.Provider value={context}>
    {children}
    {settingsOpen ? <section className="consent-banner" role="dialog" aria-labelledby="consent-title" aria-describedby="consent-description">
      <div className="consent-copy"><h2 id="consent-title">Your privacy choices</h2><p id="consent-description">Primer uses essential cookies to keep your session working. With your permission, we also load ads, privacy-friendly analytics, and error monitoring. You can change this choice at any time.</p><nav aria-label="Privacy information"><Link href="/privacy">Privacy</Link><Link href="/cookies">Cookies</Link></nav></div>
      <div className="consent-actions"><button type="button" className="button button-secondary" onClick={() => choose("rejected")}>Reject optional</button><button type="button" className="button button-primary" onClick={() => choose("accepted")}>Allow optional</button></div>
    </section> : <button type="button" className="consent-settings" onClick={openSettings}>Privacy settings</button>}
  </ConsentContext.Provider>;
}
