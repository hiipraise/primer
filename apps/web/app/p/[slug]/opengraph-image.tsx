import { ImageResponse } from "next/og";
import { getPublicPrompt } from "@primer/db";

export const runtime = "edge";
export const alt = "A public Primer project brief";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const prompt = await getPublicPrompt(slug);
  const title = prompt?.title ?? "Project brief";
  const summary = prompt?.idea_summary ?? "A practical plan for your next build.";
  return new ImageResponse(<div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#211F1C", color: "#EDE9DF", fontFamily: "Arial" }}><div style={{ color: "#B5E0D4", fontSize: 28 }}>PRIMER ? PUBLIC PROJECT BRIEF</div><div style={{ display: "flex", flexDirection: "column", gap: 24 }}><div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1 }}>{title}</div><div style={{ color: "#B5AF9E", fontSize: 30, lineHeight: 1.35 }}>{summary.slice(0, 180)}</div></div><div style={{ color: "#C08A2E", fontSize: 24 }}>primer.build</div></div>, size);
}
