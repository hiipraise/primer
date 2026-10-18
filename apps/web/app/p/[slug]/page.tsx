import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPublicPrompt } from "@primer/db";
import { AdSlot } from "@primer/ads";
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
  return <main style={{ minHeight: "100vh", background: "#211F1C", color: "#EDE9DF", padding: "64px 20px", fontFamily: "Arial, sans-serif" }}><article style={{ maxWidth: 760, margin: "0 auto" }}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: escapedJsonLd }} />
    <Link href="/explore" style={{ color: "#B5AF9E" }}>Explore public prompts</Link><h1 style={{ fontSize: 36, margin: "36px 0 12px" }}>{prompt.title}</h1>
    <p style={{ color: "#B5AF9E", lineHeight: 1.6 }}>{prompt.idea_summary}</p><h2 style={{ marginTop: 40 }}>Recommended stack</h2>
    {stack.length ? <ul style={{ display: "grid", gap: 12, paddingLeft: 22 }}>{stack.map((item, index) => <li key={`${item.name ?? "stack"}-${index}`}><strong>{item.name ?? "Recommended tool"}</strong>{item.reason && <p style={{ color: "#B5AF9E", margin: "5px 0" }}>{item.reason}</p>}</li>)}</ul> : <p>No stack details were included.</p>}
    {prompt.tags.length > 0 && <nav aria-label="Prompt tags" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 20 }}>{prompt.tags.map((tag) => <Link key={tag} href={`/explore/tag/${encodeURIComponent(tag)}`} style={{ color: "#B5E0D4" }}>#{tag}</Link>)}</nav>}
    <h2 style={{ marginTop: 40 }}>Final prompt</h2><pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, border: "1px solid #3A362E", padding: 20, borderRadius: 8 }}>{generation.output_prompt}</pre>
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}><CopyPrompt prompt={generation.output_prompt} /><Link href={`/?idea=${encodeURIComponent(prompt.idea_summary)}`} style={{ color: "#B5E0D4" }}>Fork this prompt</Link><ReportPrompt slug={prompt.slug} /></div>
    <AdSlot position="public-prompt-sidebar" width={280} height={250} /></article></main>;
}
