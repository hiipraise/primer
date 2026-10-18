import { NextResponse } from "next/server";
import { getAllGenerations, getGeneration, getLatestGeneration, getSession } from "@primer/db";
import { getRequestIdentity, sessionOwner } from "../../../lib/request-identity";
import { generationsQuerySchema } from "../../../lib/validation";
import { internalError } from "../../../lib/api-error";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = generationsQuerySchema.safeParse({
    session_id: searchParams.get("session_id") ?? undefined,
    version: searchParams.get("version") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters.", code: "INVALID_QUERY" }, { status: 400 });
  }

  try {
    const identity = await getRequestIdentity(request);
    const owner = sessionOwner(identity);
    if (!owner) return NextResponse.json({ error: "Authentication required.", code: "UNAUTHORIZED" }, { status: 401 });
    const session = await getSession(parsed.data.session_id, owner);
    if (!session) return NextResponse.json({ error: "Session not found.", code: "SESSION_NOT_FOUND" }, { status: 404 });

    if (parsed.data.version) {
      const versionNumber = Number(parsed.data.version);
      const generation = await getGeneration(parsed.data.session_id, versionNumber, owner);
      if (!generation) return NextResponse.json({ error: "Generation not found.", code: "GENERATION_NOT_FOUND" }, { status: 404 });
      return NextResponse.json({
        generation: {
          id: generation.id,
          session_id: generation.session_id,
          version_number: generation.version_number,
          user_input: generation.user_input,
          output_prompt: generation.output_prompt,
          stack: generation.stack_json,
          tools: generation.tools_json,
          skills: generation.skills_json,
          format: generation.format,
          created_at: generation.created_at,
        },
      });
    }

    const generations = await getAllGenerations(parsed.data.session_id, owner);
    const latest = await getLatestGeneration(parsed.data.session_id, owner);
    return NextResponse.json({
      generations: generations.map((generation) => ({
        id: generation.id,
        session_id: generation.session_id,
        version_number: generation.version_number,
        user_input: generation.user_input,
        output_prompt: generation.output_prompt,
        stack: generation.stack_json,
        tools: generation.tools_json,
        skills: generation.skills_json,
        format: generation.format,
        created_at: generation.created_at,
      })),
      latest_version: latest?.version_number ?? 0,
      total: generations.length,
    });
  } catch (error) {
    return internalError("api/generations", error, "GENERATIONS_FETCH_FAILED");
  }
}
