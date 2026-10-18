import { NextResponse } from "next/server";
import { createSession, createGeneration, getSession, getLatestGeneration, getAllGenerations, getOrCreateAnonSession, incrementAnonGenerations, refundAnonGeneration } from "@primer/db";
import type { SessionOwner } from "@primer/db";
import { getEngine, RateLimitError } from "@primer/engine";
import type { EngineOutput, PriorContext } from "@primer/engine";
import { attachAnonCookie, getClientIp, getRequestIdentity } from "../../../lib/request-identity";
import { generateBodySchema } from "../../../lib/validation";
import { internalError } from "../../../lib/api-error";

const DEFAULT_ANON_CAP = 3;
const configuredCap = Number(process.env.ANON_GENERATION_CAP ?? "");
const ANON_GENERATION_CAP = Number.isSafeInteger(configuredCap) && configuredCap > 0 ? configuredCap : DEFAULT_ANON_CAP;

export async function POST(request: Request) {
  let anonCookieId: string | null = null;
  let shouldSetCookie = false;
  let slotReserved = false;

  const json = (body: unknown, init?: ResponseInit) => {
    const response = NextResponse.json(body, init);
    return anonCookieId ? attachAnonCookie(response, anonCookieId, shouldSetCookie) : response;
  };

  try {
    const rawBody = await request.json().catch(() => null);
    const parsedBody = generateBodySchema.safeParse(rawBody);
    if (!parsedBody.success) {
      return json({ error: "Invalid generation request.", code: "INVALID_REQUEST" }, { status: 400 });
    }
    const body = parsedBody.data;

    const engine = getEngine();
    const ip = getClientIp(request);
    await engine.checkRateLimit(ip);

    const identityCookie = await getRequestIdentity(request);
    const userId = identityCookie.userId;
    anonCookieId = identityCookie.anonCookieId;
    if (!userId && !anonCookieId) {
      anonCookieId = crypto.randomUUID();
      shouldSetCookie = true;
    }

    const owner: SessionOwner = userId
      ? { userId }
      : { userId: null, anonCookieId: anonCookieId! };

    let sessionId = body.session_id;
    let priorContext: PriorContext | undefined;
    let versionNumber = 1;

    if (sessionId) {
      const existing = await getSession(sessionId, owner);
      if (!existing) return json({ error: "Session not found.", code: "SESSION_NOT_FOUND" }, { status: 404 });
      const latestGen = await getLatestGeneration(sessionId, owner);
      if (latestGen) {
        const versions = await getAllGenerations(sessionId, owner);
        if (!latestGen.spec_json) return json({ error: "This session cannot be refined because its structured specification is unavailable.", code: "SPEC_NOT_FOUND" }, { status: 409 });
        priorContext = { originalIdea: versions[0]?.user_input ?? latestGen.user_input, currentSpec: latestGen.spec_json as unknown as import("@primer/engine").GenerationSpec };
        versionNumber = latestGen.version_number + 1;
      }
    }

    if (!userId) {
      await getOrCreateAnonSession(anonCookieId!);
      const used = await incrementAnonGenerations(anonCookieId!, ANON_GENERATION_CAP);
      if (used === 0) {
        return json({
          error: "You've used all free generations. Sign in to continue.",
          code: "ANON_CAP_REACHED",
          cap: ANON_GENERATION_CAP,
        }, { status: 403 });
      }
      slotReserved = true;
    }

    if (!sessionId) {
      const session = await createSession({
        userId,
        anonCookieId: userId ? null : anonCookieId,
        title: body.input.slice(0, 100),
      });
      sessionId = session.id;
    }

    const result: EngineOutput = await engine.generate({
      input: body.input,
      session_id: sessionId,
      ip,
      rateLimitChecked: true,
      priorContext,
      format: body.format ?? "generic",
    });

    const generation = await createGeneration({
      sessionId,
      versionNumber,
      userInput: body.input,
      outputPrompt: result.prompt,
      stack: result.stack,
      tools: result.tools,
      skills: result.skills,
      format: result.format,
      spec: result.spec as unknown as Record<string, unknown>,
      changeSummary: result.change_summary,
      owner,
    });
    slotReserved = false;

    const payload = {
      prompt: result.prompt,
      stack: result.stack,
      tools: result.tools,
      skills: result.skills,
      session_id: sessionId,
      generation_id: generation.id,
      version_number: versionNumber,
      created_at: result.created_at,
      format: result.format,
      spec: result.spec,
      files: result.files,
      change_summary: result.change_summary,
    };
    const encoder = new TextEncoder();
    const frames = [
      ...Object.entries({ summary: result.spec.summary, assumptions: result.spec.assumptions, stack: result.stack, tools: result.tools, skills: result.skills, architecture: result.spec.architecture, data_model: result.spec.data_model, api_endpoints: result.spec.api_endpoints, folder_structure: result.spec.folder_structure, milestones: result.spec.milestones, testing_plan: result.spec.testing_plan, deployment_plan: result.spec.deployment_plan, risks: result.spec.risks, what_changed: result.change_summary }).map(([section, value]) => `event: section\ndata: ${JSON.stringify({ section, value })}\n\n`),
      `event: complete\ndata: ${JSON.stringify(payload)}\n\n`,
    ];
    const response = new Response(new ReadableStream({ async start(controller) { for (const frame of frames) { controller.enqueue(encoder.encode(frame)); await new Promise((resolve) => setTimeout(resolve, 25)); } controller.close(); } }), { headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
    return anonCookieId ? attachAnonCookie(response, anonCookieId, shouldSetCookie) : response;
  } catch (error) {
    if (slotReserved && anonCookieId) {
      try {
        await refundAnonGeneration(anonCookieId);
      } catch (refundError) {
        console.error("[api/generate] ANON_SLOT_REFUND_FAILED", refundError);
      }
    }
    if (error instanceof RateLimitError) {
      return json({ error: "Too many requests. Please try again later.", code: "RATE_LIMITED", retry_after: error.retryAfter }, {
        status: 429,
        headers: { "Retry-After": String(error.retryAfter), "X-RateLimit-Reset": String(error.resetAt) },
      });
    }
    const response = internalError("api/generate", error, "GENERATION_FAILED");
    return anonCookieId ? attachAnonCookie(response, anonCookieId, shouldSetCookie) : response;
  }
}
