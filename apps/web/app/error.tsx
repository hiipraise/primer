"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="route-state"><span className="eyebrow">Something went wrong</span><h1>This page hit a snag.</h1><p>Your saved work is safe. Try loading the page again.</p><button className="button button-primary" onClick={() => reset()}>Try again</button></main>;
}
