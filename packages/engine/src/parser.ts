import { z } from "zod";
import type { GenerationSpec } from "./types";

const itemSchema = z.object({ name: z.string().min(1), reason: z.string().min(1) });
export const generationSpecSchema = z.object({
  summary: z.string().min(1),
  assumptions: z.array(z.string()),
  stack: z.array(itemSchema),
  tools: z.array(itemSchema),
  skills: z.array(itemSchema),
  architecture: z.string().min(1),
  data_model: z.string().min(1),
  api_endpoints: z.array(z.string()),
  folder_structure: z.array(z.string()),
  milestones: z.array(z.object({ name: z.string().min(1), description: z.string().min(1) })),
  testing_plan: z.array(z.string()),
  deployment_plan: z.array(z.string()),
  risks: z.array(z.string()),
  what_changed: z.string().min(1),
  output_prompt: z.string().min(1),
});

export class InvalidGenerationResponseError extends Error {
  readonly code = "INVALID_GENERATION_RESPONSE";
  constructor(message = "The generated specification did not match the required format.") {
    super(message);
    this.name = "InvalidGenerationResponseError";
  }
}

export function parseEngineResponse(raw: string): GenerationSpec {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch {
    throw new InvalidGenerationResponseError("The model response was not valid JSON.");
  }
  const result = generationSpecSchema.safeParse(parsed);
  if (!result.success) {
    throw new InvalidGenerationResponseError("The model response did not match the specification schema.");
  }
  return result.data as GenerationSpec;
}
