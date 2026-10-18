import { callGroq } from "./groq";
import { parseEngineResponse } from "./parser";
import { getRateLimiter } from "./rate-limiter";
import { SYSTEM_PROMPT } from "./system-prompt";
import { formatPrompt } from "./formatter";
import type { EngineConfig, EngineInput, EngineOutput } from "./types";

const DEFAULT_CONFIG: EngineConfig = {
  groqApiKey: "",
  model: "llama-3.3-70b-versatile",
  maxTokens: 2048,
  temperature: 0.7,
};

export class PrimerEngine {
  private config: EngineConfig;

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Check the IP limit before a route creates or loads session data. */
  async checkRateLimit(ip: string): Promise<void> {
    const result = await getRateLimiter(this.config.rateLimit).check(ip);
    if (!result.allowed) {
      const retryAfter = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
      throw new RateLimitError("Rate limit exceeded.", retryAfter, result.resetAt);
    }
  }

  async generate(input: EngineInput): Promise<EngineOutput> {
    if (!input.rateLimitChecked) await this.checkRateLimit(input.ip);
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

    const raw = await callGroq({
      apiKey: this.config.groqApiKey,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature,
    });

    const sessionId = input.session_id ?? crypto.randomUUID();
    const parsed = parseEngineResponse(raw, sessionId);
    return {
      ...parsed,
      prompt: formatPrompt(parsed.prompt, input.format ?? "generic"),
      format: input.format ?? "generic",
    };
  }
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number,
    public resetAt: number,
  ) {
    super(message);
    this.name = "RateLimitError";
  }
}

let globalEngine: PrimerEngine | null = null;

export function getEngine(config?: Partial<EngineConfig>): PrimerEngine {
  if (!globalEngine) {
    const apiKey = config?.groqApiKey ?? process.env.GROQ_API_KEY ?? "";
    if (!apiKey) throw new Error("GROQ_API_KEY is not configured.");
    globalEngine = new PrimerEngine({ ...config, groqApiKey: apiKey });
  }
  return globalEngine;
}
