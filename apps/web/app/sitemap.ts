import type { MetadataRoute } from "next";
import { getPublicPromptSitemapEntries } from "@primer/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://primer.build").replace(/\/$/, "");
  const prompts = await getPublicPromptSitemapEntries();
  const tags = Array.from(new Set(prompts.flatMap((prompt) => prompt.tags)));
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/explore`, changeFrequency: "daily", priority: 0.8 },
    ...prompts.map((prompt) => ({ url: `${base}/p/${prompt.slug}`, lastModified: new Date(prompt.created_at), changeFrequency: "monthly" as const, priority: 0.6 })),
    ...tags.map((tag) => ({ url: `${base}/explore/tag/${encodeURIComponent(tag)}`, changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
