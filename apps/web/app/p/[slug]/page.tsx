import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicPrompt } from "@primer/db";
import { ConsentAdSlot } from "../../../components/consent-ad-slot";
import { CopyPrompt } from "./copy-prompt";
import { ReportPrompt } from "./report-prompt";

export const dynamic = "force-dynamic";
type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const prompt = await getPublicPrompt(slug);
  if (!prompt) return { title: "Prompt not found | Primer", robots: { index: false, follow: false } };
  const description = prompt.idea_summary.slice(0, 200);
  const url = `/p/${prompt.slug}`;
  return { title: `${prompt.title} | Primer`, description, alternates: { canonical: url },
    openGraph: { type: "article", title: prompt.title, description, url, images: [{ url: `/p/${prompt.slug}/opengraph-image`, width: 1200, height: 630, alt: prompt.title }] },
    twitter: { card: "summary_large_image", title: prompt.title, description, images: [`/p/${prompt.slug}/opengraph-image`] } };
}

export default async function PublicPromptPage({ params }: PageProps) {
  const { slug } = await params;
  const userAgent = (await headers()).get("user-agent") ?? "";
  const isBot = /bot|crawler|spider|slurp|facebookexternalhit|preview/i.test(userAgent);
  const prompt = await getPublicPrompt(slug, { countView: !isBot });
  if (!prompt || !prompt.generation) notFound();
  const generation = prompt.generation;
  const stack = Array.isArray(generation.stack_json) ? generation.stack_json as Array<{ name?: string; reason?: string }> : [];
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: prompt.title, description: prompt.idea_summary, datePublished: prompt.created_at, mainEntityOfPage: `/p/${prompt.slug}`, author: { "@type": "Organization", name: "Primer" } };
  const escapedJsonLd = JSON.stringify(jsonLd).replace(/</g, "\\u003c");
  return <main className="explore-page"><article className="public-prompt-page">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: escapedJsonLd }} />
    <Link className="explore-brand-link" href="/explore">Explore public prompts</Link><h1 className="public-prompt-title">{prompt.title}</h1>
    <p className="public-prompt-summary">{prompt.idea_summary}</p><h2 className="public-prompt-section-title">Recommended stack</h2>
    {stack.length ? <ul className="public-prompt-stack">{stack.map((item, index) => <li key={`${item.name ?? "stack"}-${index}`}><strong>{item.name ?? "Recommended tool"}</strong>{item.reason && <p>{item.reason}</p>}</li>)}</ul> : <p>No stack details were included.</p>}
    {prompt.tags.length > 0 && <nav className="public-prompt-tags" aria-label="Prompt tags">{prompt.tags.map((tag) => <Link key={tag} href={`/explore/tag/${encodeURIComponent(tag)}`}>#{tag}</Link>)}</nav>}
    <h2 className="public-prompt-section-title">Final prompt</h2><pre className="public-prompt-content">{generation.output_prompt}</pre>
    <div className="public-prompt-actions"><CopyPrompt prompt={generation.output_prompt} /><Link className="public-prompt-fork" href={`/?idea=${encodeURIComponent(prompt.idea_summary)}`}>Fork this prompt</Link><ReportPrompt slug={prompt.slug} /></div>
    <ConsentAdSlot position="public-prompt-sidebar" width={280} height={250} /></article></main>;
}
