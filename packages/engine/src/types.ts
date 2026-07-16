// ─── Input ───────────────────────────────────────────────────────────
export interface PriorContext {
  /** The user's previous input */
  previousInput: string;
  /** The previously generated output prompt */
  previousOutput: string;
}

export interface EngineInput {
  /** The user's idea description */
  input: string;
  /** Unique identifier for this session (for later Phase 4) */
  session_id?: string;
  /** Client IP address for rate limiting */
  ip: string;
  /** Prior context from a previous generation (for refinements) */
  priorContext?: PriorContext;
}

// ─── Output ──────────────────────────────────────────────────────────
export interface StackItem {
  name: string;
  reason: string;
}

export interface ToolItem {
  name: string;
  reason: string;
}

export interface SkillItem {
  name: string;
  reason: string;
}

export interface EngineOutput {
  prompt: string;
  stack: StackItem[];
  tools: ToolItem[];
  skills: SkillItem[];
  session_id: string;
  created_at: string;
}

// ─── Rate limiting ───────────────────────────────────────────────────
export interface RateLimitConfig {
  /** Max requests allowed per window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Unix timestamp (ms) when the window resets */
  resetAt: number;
}

// ─── Engine configuration ────────────────────────────────────────────
export interface EngineConfig {
  groqApiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  rateLimit?: RateLimitConfig;
}
