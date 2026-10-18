import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { findActivePrimerApiKey } from "@primer/db";
import { estimateMonthlyCostNgn, getEngine, RateLimitError } from "@primer/engine";
import { generateBodySchema } from "../../../../lib/validation";
import { internalError } from "../../../../lib/api-error";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(pr_live_[A-Za-z0-9_-]{40,})$/);
  if (!match) return NextResponse.json({ error: "A valid Primer API key is required.", code: "UNAUTHORIZED" }, { status: 401 });
  const parsed = generateBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid generation request.", code: "INVALID_REQUEST" }, { status: 400 });
  try {
    const key = await findActivePrimerApiKey(createHash("sha256").update(match[1]).digest("hex"));
    if (!key) return NextResponse.json({ error: "A valid Primer API key is required.", code: "UNAUTHORIZED" }, { status: 401 });
    const engine = getEngine();
    await engine.checkRateLimit(`api-key:${key.id}`);
    const context = [
      `Launch region preset: ${parsed.data.region ?? "global"}.`,
      `Low-bandwidth optimization: ${parsed.data.low_bandwidth ? "required" : "not requested"}.`,
    ].join(" ");
    const result = await engine.generate({ input: `${parsed.data.input}\n\n[Regional deployment context]\n${context}`, ip: `api-key:${key.id}`, rateLimitChecked: true, format: parsed.data.format ?? "generic" });
    return NextResponse.json({ prompt: result.prompt, stack: result.stack, tools: result.tools, skills: result.skills, spec: result.spec, files: result.files, format: result.format, change_summary: result.change_summary, estimated_monthly_cost: estimateMonthlyCostNgn() }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: "API key rate limit reached.", code: "RATE_LIMITED", retry_after: error.retryAfter }, { status: 429, headers: { "Retry-After": String(error.retryAfter) } });
    return internalError("api/v1/generate", error, "GENERATION_FAILED");
  }
}
