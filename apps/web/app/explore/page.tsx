import Link from "next/link";
import { listPublicPrompts } from "@primer/db";
import { AdSlot } from "@primer/ads";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
  const prompts = await listPublicPrompts({ page: 1, limit: 30 });
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
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <Link href="/" style={{ color: "#B5AF9E" }}>
          Primer
        </Link>
        <h1 style={{ fontSize: 42, margin: "36px 0 10px" }}>
          Explore public prompts
        </h1>
        <p style={{ color: "#B5AF9E" }}>
          Ideas shared by people preparing to build.
        </p>
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 280px",
            gap: 24,
            marginTop: 36,
          }}
        >
          <div style={{ display: "grid", gap: 12 }}>
            {prompts.map((prompt) => (
              <Link
                key={prompt.id}
                href={`/p/${prompt.slug}`}
                style={{
                  color: "inherit",
                  textDecoration: "none",
                  border: "1px solid #3A362E",
                  borderRadius: 8,
                  padding: 20,
                }}
              >
                <h2 style={{ margin: 0, fontSize: 20 }}>{prompt.title}</h2>
                <p style={{ color: "#B5AF9E", lineHeight: 1.5 }}>
                  {prompt.idea_summary}
                </p>
                <small style={{ color: "#C08A2E" }}>
                  {prompt.view_count} views
                </small>
              </Link>
            ))}
          </div>
          <aside style={{ minHeight: 250 }} aria-label="Advertisement space">
            <AdSlot position="explore-sidebar" width={280} height={250} />
          </aside>
        </section>
      </div>
    </main>
  );
}
