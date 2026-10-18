import type { FormattedFile, GenerationSpec, PromptFormat } from "./types";

export interface FormattedOutput { files: FormattedFile[]; combined: string }

const bullets = (items: string[]) => items.length ? items.map((item) => `- ${item}`).join("\n") : "- None specified";
const recommendations = (items: GenerationSpec["stack"]) => items.length
  ? items.map(({ name, reason }) => `- **${name}:** ${reason}`).join("\n")
  : "- None specified";

function specSections(spec: GenerationSpec): string {
  return [
    `# ${spec.summary}`,
    `## Assumptions\n${bullets(spec.assumptions)}`,
    `## Recommended stack\n${recommendations(spec.stack)}`,
    `## Tools\n${recommendations(spec.tools)}`,
    `## Skills\n${recommendations(spec.skills)}`,
    `## Architecture\n${spec.architecture}`,
    `## Data model\n${spec.data_model}`,
    `## API endpoints\n${bullets(spec.api_endpoints)}`,
    `## Folder structure\n${bullets(spec.folder_structure)}`,
    `## Milestones\n${spec.milestones.map((m) => `- **${m.name}:** ${m.description}`).join("\n") || "- None specified"}`,
    `## Testing plan\n${bullets(spec.testing_plan)}`,
    `## Deployment plan\n${bullets(spec.deployment_plan)}`,
    `## Risks\n${bullets(spec.risks)}`,
  ].join("\n\n");
}

export function formatPrompt(spec: GenerationSpec, format: PromptFormat): FormattedOutput {
  const sections = specSections(spec);
  let files: FormattedFile[];
  switch (format) {
    case "claude-code": {
      const content = `# Project instructions\n\n${sections}\n\n## Commands\n\n- \`pnpm dev\`: start the development server.\n- \`pnpm typecheck\`: check TypeScript.\n- \`pnpm lint\`: run lint checks.\n- \`pnpm test\`: run the test suite.\n- \`pnpm build\`: build the application.\n\n## Conventions\n\nFollow existing code style, preserve established architecture, and make small, focused changes.\n\n## Structure\n\nUse the folder structure above as the guide; inspect the repository before creating files.`;
      files = [{ path: "CLAUDE.md", content }];
      break;
    }
    case "cursor": {
      const content = `---\ndescription: Project architecture and implementation requirements\nglobs: **/*\nalwaysApply: true\n---\n\n${sections}\n\n## Implementation conventions\n\nFollow the existing repository conventions and validate changes with the project's checks.`;
      files = [{ path: ".cursor/rules/primer-project.mdc", content }];
      break;
    }
    case "windsurf": {
      const content = `# Workspace rules\n\n${sections}\n\n## Working agreements\n\nKeep changes aligned with the existing repository, preserve user requirements, and verify modified behavior.`;
      files = [{ path: ".windsurfrules", content }];
      break;
    }
    case "v0": {
      const content = `# UI and component brief\n\n${spec.summary}\n\n## Product requirements\n${spec.assumptions.map((a) => `- ${a}`).join("\n")}\n\n## Architecture context\n${spec.architecture}\n\n## Data and API\n${spec.data_model}\n${spec.api_endpoints.map((e) => `- ${e}`).join("\n")}\n\n## Build direction\nCreate responsive, accessible UI components that fit the stated architecture. Use realistic states and content, and keep components composable.\n\n## Delivery plan\n${spec.milestones.map((m) => `- ${m.name}: ${m.description}`).join("\n")}`;
      files = [{ path: "UI_BRIEF.md", content }];
      break;
    }
    default:
      files = [{ path: "PRD.md", content: `${sections}\n\n## Execution-ready prompt\n\n${spec.output_prompt}` }];
  }
  return { files, combined: files.map(({ path, content }) => `--- ${path} ---\n${content}`).join("\n\n") };
}
