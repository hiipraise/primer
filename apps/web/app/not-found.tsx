import Link from "next/link";

export default function NotFoundPage() {
  return <main className="route-state"><span className="eyebrow">404 · Not found</span><h1>This page isn’t here.</h1><p>The link may be old, or the page may have moved.</p><Link className="button button-primary" href="/">Back to Primer</Link></main>;
}
