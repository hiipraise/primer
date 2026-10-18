import { describe, expect, it } from "vitest";
import { lintPrompt } from "./prompt-lint";

describe("lintPrompt", () => {
  it("reports actionable gaps for a vague idea", () => {
    const result = lintPrompt("Build an app.");
    expect(result.score).toBeLessThan(50);
    expect(result.fixes.map((fix) => fix.id)).toContain("user");
  });
  it("rewards specific ideas and leaves fewer fixes", () => {
    const result = lintPrompt("Build a web app for clinic patients to book visits and track payments. Use the existing stack, launch in 8 weeks, and reduce missed appointments by 20%.");
    expect(result.score).toBeGreaterThan(70);
    expect(result.fixes).toHaveLength(0);
  });
});
