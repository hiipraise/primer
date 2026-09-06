import { notFound } from "next/navigation";
import { getPublicPrompt } from "@primer/db";
import { AdSlot } from "@primer/ads";
import { CopyPrompt } from "./copy-prompt";

export const dynamic = "force-dynamic";

export default async function PublicPromptPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const prompt = await getPublicPrompt(slug);
  if (!prompt || !prompt.generation) notFound();
  const generation = prompt.generation;
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#211F1C",
        color: "#EDE9DF",
        padding: "64px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <article style={{ maxWidth: 760, margin: "0 auto" }}>
        <a href="/explore" style={{ color: "#B5AF9E" }}>
          Explore public prompts
        </a>
        <h1 style={{ fontSize: 36, margin: "36px 0 12px" }}>{prompt.title}</h1>
        <p style={{ color: "#B5AF9E", lineHeight: 1.6 }}>
          {prompt.idea_summary}
        </p>
        <h2 style={{ marginTop: 40 }}>Recommended stack</h2>
        <pre style={{ whiteSpace: "pre-wrap", color: "#B5E0D4" }}>
          {prompt.stack_summary}
        </pre>
        <h2 style={{ marginTop: 40 }}>Final prompt</h2>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            lineHeight: 1.7,
            border: "1px solid #3A362E",
            padding: 20,
            borderRadius: 8,
          }}
        >
          {generation.output_prompt}
        </pre>
        <CopyPrompt prompt={generation.output_prompt} />
        <AdSlot position="public-prompt-sidebar" width={280} height={250} />
      </article>
    </main>
  );
}
