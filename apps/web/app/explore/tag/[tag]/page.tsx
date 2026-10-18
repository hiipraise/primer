import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listPublicPrompts } from "@primer/db";

type Props = { params: Promise<{ tag: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const label = decodeURIComponent(tag).replace(/-/g, " ");
  return { title: `${label} prompts | Primer`, description: `Public project briefs tagged ${label}.` };
}
export default async function ExploreTagPage({ params }: Props) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(decoded) || decoded.length > 80) notFound();
  const prompts = await listPublicPrompts({ page: 1, limit: 50, tag: decoded });
  return <main className="explore-page"><div className="explore-container explore-tag-container"><Link className="explore-brand-link" href="/explore">Explore public prompts</Link><h1 className="explore-title">Prompts tagged #{decoded.replace(/-/g, " ")}</h1><div className="explore-prompt-list">{prompts.map((prompt) => <article className="explore-prompt-card" key={prompt.id}><Link href={`/p/${prompt.slug}`}><h2>{prompt.title}</h2></Link><p>{prompt.idea_summary}</p></article>)}{!prompts.length && <p>No public prompts use this tag yet.</p>}</div></div></main>;
}
