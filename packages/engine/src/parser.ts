import type { EngineOutput } from "./types";

// ─── Parse LLM response into structured output ───────────────────────
export function parseEngineResponse(
  raw: string,
  sessionId: string
): EngineOutput {
  let json = raw.trim();

  // Strip markdown code fences if the model wrapped the JSON
  const fenceMatch = json.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    json = fenceMatch[1].trim();
  }

  // Parse the JSON
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json);
  } catch {
    // If parsing fails, return a fallback with the raw text as the prompt
    return {
      prompt: raw,
      stack: [],
      tools: [],
      skills: [],
      session_id: sessionId,
      created_at: new Date().toISOString(),
    };
  }

  // Extract fields with validation
  const prompt =
    typeof parsed.output_prompt === "string"
      ? parsed.output_prompt
      : typeof parsed.prompt === "string"
        ? parsed.prompt
        : raw;

  const stack = normalizeItems(parsed.stack);
  const tools = normalizeItems(parsed.tools);
  const skills = normalizeItems(parsed.skills);

  return {
    prompt,
    stack,
    tools,
    skills,
    session_id: sessionId,
    created_at: new Date().toISOString(),
  };
}

// ─── Normalize an array of { name, reason } items ────────────────────
function normalizeItems(
  items: unknown
): Array<{ name: string; reason: string }> {
  if (!Array.isArray(items)) return [];

  return items
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null
    )
    .map((item) => ({
      name:
        typeof item.name === "string"
          ? item.name
          : typeof item.name === "number"
            ? String(item.name)
            : "Unnamed",
      reason:
        typeof item.reason === "string"
          ? item.reason
          : typeof item.description === "string"
            ? item.description
            : "",
    }))
    .filter((item) => item.name !== "Unnamed" || item.reason);
}
