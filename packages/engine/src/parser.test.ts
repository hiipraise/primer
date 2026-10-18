import { describe, expect, it } from "vitest";
import { parseEngineResponse } from "./parser";

describe("parseEngineResponse", () => {
  it("parses structured recommendations", () => {
    const result = parseEngineResponse(
      JSON.stringify({
        output_prompt: "Build a budgeting app.",
        stack: [{ name: "Next.js", reason: "Full-stack app framework." }],
        tools: [{ name: "Supabase", reason: "Database and auth." }],
        skills: [{ name: "Accessibility", reason: "Support all users." }],
      }),
      "session-1",
    );

    expect(result.prompt).toBe("Build a budgeting app.");
    expect(result.stack[0]?.name).toBe("Next.js");
    expect(result.tools[0]?.name).toBe("Supabase");
    expect(result.skills[0]?.name).toBe("Accessibility");
    expect(result.session_id).toBe("session-1");
  });

  it("accepts JSON wrapped in a markdown code fence", () => {
    const result = parseEngineResponse(
      '```json\n{"output_prompt":"Build it","stack":[]}\n```',
      "session-2",
    );

    expect(result.prompt).toBe("Build it");
    expect(result.stack).toEqual([]);
  });
});
