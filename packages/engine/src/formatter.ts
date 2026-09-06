import type { PromptFormat } from "./types";

export function formatPrompt(prompt: string, format: PromptFormat): string {
  if (format === "generic") return prompt;

  const headings: Record<Exclude<PromptFormat, "generic">, string> = {
    "claude-code": "Build order and file structure",
    cursor: "Implementation context and acceptance criteria",
    v0: "Interface direction and component requirements",
    windsurf: "Workspace plan and implementation steps",
  };

  return `${prompt.trim()}\n\n## ${headings[format]}\n\nTarget: ${format}.\nPreserve the stated requirements, then implement in small, testable steps.`;
}
