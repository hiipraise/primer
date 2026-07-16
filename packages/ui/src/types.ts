// ─── Shared types for the Primer recommendation engine ──────────────

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

export interface GenerationResult {
  prompt: string;
  stack: StackItem[];
  tools: ToolItem[];
  skills: SkillItem[];
  /** Unique session identifier for refinement chaining */
  session_id?: string;
  /** Which version within the session this is (1-based) */
  version_number?: number;
  /** When this generation was created */
  created_at?: string;
}
