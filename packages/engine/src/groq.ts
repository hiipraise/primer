import Groq from "groq-sdk";

// ─── Client singleton ────────────────────────────────────────────────
let client: Groq | null = null;

function getClient(apiKey: string): Groq {
  if (!client) {
    client = new Groq({ apiKey });
  }
  return client;
}

// ─── Types ───────────────────────────────────────────────────────────
export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqCallOptions {
  apiKey: string;
  messages: GroqMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

// ─── Defaults ────────────────────────────────────────────────────────
const DEFAULT_MODEL = "llama-3.3-70b-versatile";
const DEFAULT_MAX_TOKENS = 2048;
const DEFAULT_TEMPERATURE = 0.7;

// ─── Call Groq API ───────────────────────────────────────────────────
export async function callGroq(
  options: GroqCallOptions
): Promise<string> {
  const {
    apiKey,
    messages,
    model = DEFAULT_MODEL,
    maxTokens = DEFAULT_MAX_TOKENS,
    temperature = DEFAULT_TEMPERATURE,
  } = options;

  const groq = getClient(apiKey);

  const completion = await groq.chat.completions.create({
    messages,
    model,
    max_tokens: maxTokens,
    temperature,
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("Groq returned an empty response.");
  }

  return content;
}
