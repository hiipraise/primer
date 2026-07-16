import { NextResponse } from "next/server";
import {
  getAllGenerations,
  getGeneration,
  getLatestGeneration,
} from "@primer/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");
  const versionParam = searchParams.get("version");

  if (!sessionId) {
    return NextResponse.json(
      { error: "session_id query parameter is required." },
      { status: 400 }
    );
  }

  try {
    // Fetch a specific version
    if (versionParam !== null) {
      const versionNumber = parseInt(versionParam, 10);
      if (isNaN(versionNumber) || versionNumber < 1) {
        return NextResponse.json(
          { error: "Invalid version number." },
          { status: 400 }
        );
      }

      const gen = await getGeneration(sessionId, versionNumber);
      if (!gen) {
        return NextResponse.json(
          { error: "Generation not found." },
          { status: 404 }
        );
      }

      return NextResponse.json({
        generation: {
          id: gen.id,
          session_id: gen.session_id,
          version_number: gen.version_number,
          user_input: gen.user_input,
          output_prompt: gen.output_prompt,
          stack: gen.stack_json as Array<{ name: string; reason: string }> | null,
          tools: gen.tools_json as Array<{ name: string; reason: string }> | null,
          skills: gen.skills_json as Array<{ name: string; reason: string }> | null,
          created_at: gen.created_at,
        },
      });
    }

    // Fetch all generations for the session
    const generations = await getAllGenerations(sessionId);
    const latest = await getLatestGeneration(sessionId);

    return NextResponse.json({
      generations: generations.map((gen) => ({
        id: gen.id,
        session_id: gen.session_id,
        version_number: gen.version_number,
        user_input: gen.user_input,
        output_prompt: gen.output_prompt,
        stack: gen.stack_json,
        tools: gen.tools_json,
        skills: gen.skills_json,
        created_at: gen.created_at,
      })),
      latest_version: latest?.version_number ?? 0,
      total: generations.length,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch generations.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
