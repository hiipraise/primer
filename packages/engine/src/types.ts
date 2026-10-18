export interface PriorContext {
  originalIdea: string;
  currentSpec: GenerationSpec;
}

export interface EngineInput {
  input: string;
  session_id?: string;
  ip: string;
  rateLimitChecked?: boolean;
  priorContext?: PriorContext;
  format?: PromptFormat;
}

export type PromptFormat = "claude-code" | "cursor" | "v0" | "windsurf" | "generic";

export interface StackItem { name: string; reason: string }
export type ToolItem = StackItem;
export type SkillItem = StackItem;
export interface Milestone { name: string; description: string }

export interface GenerationSpec {
  summary: string;
  assumptions: string[];
  stack: StackItem[];
  tools: ToolItem[];
  skills: SkillItem[];
  architecture: string;
  data_model: string;
  api_endpoints: string[];
  folder_structure: string[];
  milestones: Milestone[];
  testing_plan: string[];
  deployment_plan: string[];
  risks: string[];
  what_changed: string;
  output_prompt: string;
}

export interface FormattedFile { path: string; content: string }
export interface EngineOutput {
  prompt: string;
  stack: StackItem[];
  tools: ToolItem[];
  skills: SkillItem[];
  spec: GenerationSpec;
  files: FormattedFile[];
  change_summary: string;
  session_id: string;
  created_at: string;
  format: PromptFormat;
}

export interface RateLimitConfig { maxRequests: number; windowMs: number }
export interface RateLimitResult { allowed: boolean; remaining: number; resetAt: number }
export interface EngineConfig {
  groqApiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  rateLimit?: RateLimitConfig;
}
