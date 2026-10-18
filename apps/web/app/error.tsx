"use client";

import { useEffect } from "react";
import { useConsent } from "../components/consent-provider";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { choice, reportException } = useConsent();
  useEffect(() => { if (choice === "accepted") reportException(error); }, [choice, error, reportException]);
  return <main className="route-state"><span className="eyebrow">Something went wrong</span><h1>This page hit a snag.</h1><p>Your saved work is safe. Try loading the page again.</p><button className="button button-primary" onClick={() => reset()}>Try again</button></main>;
}
