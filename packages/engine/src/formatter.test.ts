import { describe, expect, it } from "vitest";
import { formatPrompt } from "./formatter";
import type { GenerationSpec, PromptFormat } from "./types";

const spec: GenerationSpec = {
  summary: "Budget planning app", assumptions: ["Web-first"],
  stack: [{ name: "Next.js", reason: "Full-stack React." }], tools: [], skills: [],
  architecture: "App router", data_model: "Users and budgets", api_endpoints: ["GET /api/budgets"],
  folder_structure: ["app/"], milestones: [{ name: "MVP", description: "Track budgets" }],
  testing_plan: ["Unit tests"], deployment_plan: ["Deploy to hosting"], risks: ["Scope creep"],
  what_changed: "Initial specification.", output_prompt: "Build a budgeting app.",
};

describe("formatPrompt", () => {
  const expected: Record<PromptFormat, string> = {
    "claude-code": "CLAUDE.md", cursor: ".cursor/rules/primer-project.mdc",
    windsurf: ".windsurfrules", v0: "UI_BRIEF.md", generic: "PRD.md",
  };
  it.each(Object.entries(expected) as [PromptFormat, string][])("creates a %s file", (format, path) => {
    const result = formatPrompt(spec, format);
    expect(result.files).toHaveLength(1);
    expect(result.files[0]?.path).toBe(path);
    expect(result.files[0]?.content).toContain("Budget planning app");
    expect(result.combined).toContain(path);
  });
});
