import Link from "next/link";
import { listPublicPrompts } from "@primer/db";
import { ConsentAdSlot } from "../../components/consent-ad-slot";

export const dynamic = "force-dynamic";

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search = "" } = await searchParams;
  const prompts = await listPublicPrompts({ page: 1, limit: 30, search: search.trim().slice(0, 100) || undefined });
  return <main className="explore-page"><div className="explore-container">
    <Link className="explore-brand-link" href="/">Primer</Link>
    <h1 className="explore-title">Explore public prompts</h1>
    <p className="explore-description">Ideas shared by people preparing to build.</p>
    <form action="/explore" className="explore-search-form"><input name="search" defaultValue={search} placeholder="Search project titles" aria-label="Search project titles" maxLength={100} /><button type="submit">Search</button></form>
    <section className="explore-layout"><div className="explore-prompt-list">
      {prompts.map((prompt) => <Link className="explore-prompt-card" key={prompt.id} href={`/p/${prompt.slug}`}>
        <h2>{prompt.title}</h2><p>{prompt.idea_summary}</p><small>{prompt.view_count} views</small>
        <div className="explore-tags">{prompt.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>
      </Link>)}
      {!prompts.length && <p>No public prompts found.</p>}
    </div><aside className="explore-ad-space" aria-label="Advertisement space"><ConsentAdSlot position="explore-sidebar" width={280} height={250} /></aside></section>
  </div></main>;
}
