import { callGroq } from "./groq";
import { parseEngineResponse } from "./parser";
import { getRateLimiter } from "./rate-limiter";
import { SYSTEM_PROMPT } from "./system-prompt";
import type { EngineConfig, EngineInput, EngineOutput } from "./types";

// ─── Default configuration ──────────────────────────────────────────
const DEFAULT_CONFIG: EngineConfig = {
  groqApiKey: "",
  model: "llama-3.3-70b-versatile",
  maxTokens: 2048,
  temperature: 0.7,
};

// ─── Engine ──────────────────────────────────────────────────────────
export class PrimerEngine {
  private config: EngineConfig;

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a recommendation for a user's idea.
   * Steps:
   * 1. Rate limit check
   * 2. Build messages array (system prompt + user input)
   * 3. Call Groq
   * 4. Parse response
   * 5. Return structured output
   */
  async generate(input: EngineInput): Promise<EngineOutput> {
    // 1. Rate limit check
    const limiter = getRateLimiter(this.config.rateLimit);
    const rateResult = limiter.check(input.ip);

    if (!rateResult.allowed) {
      const resetDate = new Date(rateResult.resetAt);
      const retryAfter = Math.ceil(
        (rateResult.resetAt - Date.now()) / 1000
      );

      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${retryAfter} seconds (resets at ${resetDate.toISOString()}).`,
        retryAfter,
        rateResult.resetAt
      );
    }

    // 2. Build messages — include prior context if this is a refinement
    let userContent = `Analyze this idea and provide your structured recommendation:\n\n${input.input}`;

    if (input.priorContext) {
      userContent =
        `I previously analyzed this idea and produced the following recommendation. ` +
        `The user wants to refine it further. Here is the prior context:\n\n` +
        `--- Previous input ---\n${input.priorContext.previousInput}\n\n` +
        `--- Previous output ---\n${input.priorContext.previousOutput}\n\n` +
        `--- New refinement request ---\n${input.input}\n\n` +
        `Now produce an updated recommendation that addresses the refinement. ` +
        `Use the same JSON format as before.`;
    }

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "user" as const, content: userContent },
    ];

    // 3. Call Groq
    const raw = await callGroq({
      apiKey: this.config.groqApiKey,
      messages,
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
    });

    // 4. Parse response
    const sessionId = input.session_id ?? crypto.randomUUID();
    return parseEngineResponse(raw, sessionId);
  }
}

// ─── Rate limit error ────────────────────────────────────────────────
export class RateLimitError extends Error {
  public retryAfter: number;
  public resetAt: number;

  constructor(message: string, retryAfter: number, resetAt: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
    this.resetAt = resetAt;
  }
}

// ─── Singleton ───────────────────────────────────────────────────────
let globalEngine: PrimerEngine | null = null;

export function getEngine(config?: Partial<EngineConfig>): PrimerEngine {
  if (!globalEngine) {
    const apiKey = config?.groqApiKey ?? process.env.GROQ_API_KEY ?? "";
    if (!apiKey) {
      throw new Error(
        "GROQ_API_KEY is not configured. Add it to your .env.local file."
      );
    }
    globalEngine = new PrimerEngine({ ...config, groqApiKey: apiKey });
  }
  return globalEngine;
}
