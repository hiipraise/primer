export interface PromptLintFix { id: string; title: string; detail: string; addition: string }
export interface PromptLintResult { score: number; fixes: PromptLintFix[] }

const signals: Array<{ id: string; title: string; detail: string; addition: string; test: RegExp }> = [
  { id: "user", title: "Name the user", detail: "Say who will use this and what they need.", addition: "Target users: [who will use this and what they need]", test: /\b(user|customer|patient|student|team|people|audience|for )\b/i },
  { id: "features", title: "Describe the core workflow", detail: "List the first actions a user should be able to complete.", addition: "Core workflow: [the 2–3 most important user actions]", test: /\b(feature|workflow|create|manage|track|book|send|search|upload|pay|view)\b/i },
  { id: "platform", title: "Choose a platform", detail: "Mention web, mobile, desktop, or another target.", addition: "Platform: [web, mobile, desktop, or other]", test: /\b(web|mobile|ios|android|desktop|browser|website|app)\b/i },
  { id: "constraints", title: "Add a constraint", detail: "Include a budget, timeline, existing stack, or limitation.", addition: "Constraints: [budget, timeline, preferred stack, or limits]", test: /\b(budget|timeline|weeks?|months?|use |using |must |constraint|existing|low.bandwidth)\b/i },
  { id: "success", title: "Define success", detail: "Describe a measurable result or outcome.", addition: "Success means: [a measurable outcome]", test: /\b(success|measure|goal|outcome|reduce|increase|within|by \d|metric|target)\b/i },
];

export function lintPrompt(prompt: string): PromptLintResult {
  const normalized = prompt.trim();
  const fixes = signals.filter((signal) => !signal.test.test(normalized)).map(({ id, title, detail, addition }) => ({ id, title, detail, addition }));
  const lengthPenalty = normalized.length < 80 ? 20 : normalized.length < 180 ? 10 : 0;
  return { score: Math.max(0, Math.min(100, 100 - fixes.length * 12 - lengthPenalty)), fixes };
}
