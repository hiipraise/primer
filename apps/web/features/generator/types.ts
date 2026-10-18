export type PromptFormat = "claude-code" | "cursor" | "v0" | "windsurf" | "generic";
export interface Recommendation { name: string; reason?: string; note?: string }
export interface FormatterFile { path: string; content: string }
export interface GenerationResult {
  generation_id?: string;
  prompt: string;
  stack: Recommendation[];
  tools: Recommendation[];
  skills: Recommendation[];
  session_id: string;
  version_number: number;
  created_at?: string;
  spec?: Record<string, unknown>;
  files?: FormatterFile[];
  change_summary?: string;
  format?: PromptFormat;
}
export interface GenerationVersion extends GenerationResult {
  id: string;
  user_input: string;
  output_prompt: string;
}
export interface GenerateInput { input: string; session_id?: string; format: PromptFormat; region?: string; low_bandwidth?: boolean }
