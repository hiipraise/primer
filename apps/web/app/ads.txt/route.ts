export const dynamic = "force-dynamic";

export function GET() {
  const configured = process.env.ADS_TXT_CONTENT?.trim();
  const publisherId = process.env.ADSENSE_PUBLISHER_ID?.trim().replace(/^ca-/, "");
  const content = configured || (publisherId && /^pub-[0-9]{16}$/.test(publisherId) ? `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n` : "");
  if (!content || content.length > 10_000) return new Response("Not found", { status: 404 });
  return new Response(content.endsWith("\n") ? content : `${content}\n`, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
