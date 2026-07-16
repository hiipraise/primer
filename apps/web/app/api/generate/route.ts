import { NextResponse } from "next/server";
import { getEngine, RateLimitError } from "@primer/engine";
import type { EngineOutput, PriorContext } from "@primer/engine";
import {
  createServerSupabaseClient,
  createSession,
  getSession,
  getLatestGeneration,
  createGeneration,
  getCookieValue,
  getOrCreateAnonSession,
  incrementAnonGenerations,
} from "@primer/db";

// ─── Constants ───────────────────────────────────────────────────────
const ANON_GENERATION_CAP = 3;

// ─── Types ───────────────────────────────────────────────────────────
interface GenerateRequest {
  input: string;
  session_id?: string;
}

// ─── Helper: extract client IP ───────────────────────────────────────
function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "127.0.0.1";
}

// ─── Helper: extract user identity from request ──────────────────────
async function getIdentity(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const anonCookieId = getCookieValue(cookieHeader, "primer_anon_id");

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { user, anonCookieId };
}

// ─── Route handler ───────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const body: GenerateRequest = await request.json();

    if (!body.input || !body.input.trim()) {
      return NextResponse.json(
        { error: "Input is required." },
        { status: 400 }
      );
    }

    const engine = getEngine();
    const ip = getClientIp(request);
    const { user, anonCookieId } = await getIdentity(request);

    // ── Anonymous cap check ──
    // Authenticated users are unlimited. Anonymous users get ANON_GENERATION_CAP generations.
    if (!user && anonCookieId) {
      const anonSession = await getOrCreateAnonSession(anonCookieId);
      if (anonSession.generations_used >= ANON_GENERATION_CAP) {
        return NextResponse.json(
          {
            error: "anon_cap_reached",
            message: `You've used all ${ANON_GENERATION_CAP} free generations. Sign in to continue.`,
            used: anonSession.generations_used,
            cap: ANON_GENERATION_CAP,
          },
          { status: 403 }
        );
      }
    }

    let sessionId = body.session_id;
    let priorContext: PriorContext | undefined;
    let versionNumber = 1;

    if (sessionId) {
      // ── Refinement: load existing session for context ──
      const existing = await getSession(sessionId);
      if (!existing) {
        return NextResponse.json(
          { error: "Session not found." },
          { status: 404 }
        );
      }

      const latestGen = await getLatestGeneration(sessionId);
      if (latestGen) {
        priorContext = {
          previousInput: latestGen.user_input,
          previousOutput: latestGen.output_prompt,
        };
        versionNumber = latestGen.version_number + 1;
      }
    } else {
      // ── New session ──
      const title = body.input.trim().slice(0, 100);
      const session = await createSession({
        userId: user?.id ?? null,
        anonCookieId: anonCookieId ?? null,
        title,
      });
      sessionId = session.id;
    }

    // Run the engine with prior context (if any)
    const result: EngineOutput = await engine.generate({
      input: body.input.trim(),
      session_id: sessionId,
      ip,
      priorContext,
    });

    // Persist the generation to Postgres
    await createGeneration({
      sessionId,
      versionNumber,
      userInput: body.input.trim(),
      outputPrompt: result.prompt,
      stack: result.stack,
      tools: result.tools,
      skills: result.skills,
    });

    // Increment anonymous generation counter
    if (!user && anonCookieId) {
      await incrementAnonGenerations(anonCookieId);
    }

    return NextResponse.json({
      prompt: result.prompt,
      stack: result.stack,
      tools: result.tools,
      skills: result.skills,
      session_id: sessionId,
      version_number: versionNumber,
      created_at: result.created_at,
    });
  } catch (err) {
    // Rate limit exceeded
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        {
          error: err.message,
          retry_after: err.retryAfter,
          reset_at: new Date(err.resetAt).toISOString(),
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(err.retryAfter),
            "X-RateLimit-Reset": String(err.resetAt),
          },
        }
      );
    }

    // Groq API, DB, or other unexpected errors
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
