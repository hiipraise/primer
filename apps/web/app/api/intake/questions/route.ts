import { NextResponse } from "next/server";
import { generateIntakeQuestions, getEngine, RateLimitError } from "@primer/engine";
import { intakeBodySchema } from "../../../../lib/validation";
import { internalError } from "../../../../lib/api-error";
import { getClientIp } from "../../../../lib/request-identity";

export async function POST(request: Request) {
  const parsed = intakeBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid intake request.", code: "INVALID_REQUEST" }, { status: 400 });
  try {
    await getEngine().checkRateLimit(getClientIp(request));
    return NextResponse.json({ questions: await generateIntakeQuestions(parsed.data.input) });
  } catch (error) {
    if (error instanceof RateLimitError) return NextResponse.json({ error: "Too many requests. Please try again later.", code: "RATE_LIMITED", retry_after: error.retryAfter }, { status: 429, headers: { "Retry-After": String(error.retryAfter) } });
    return internalError("api/intake/questions", error, "INTAKE_FAILED");
  }
}
