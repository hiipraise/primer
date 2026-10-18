import { describe, expect, it } from "vitest";
import { InvalidGenerationResponseError, parseEngineResponse } from "./parser";

const valid = {
  summary: "A budgeting app", assumptions: [], stack: [{ name: "Next.js", reason: "Full stack." }],
  tools: [], skills: [], architecture: "Web app", data_model: "Users and budgets", api_endpoints: [],
  folder_structure: [], milestones: [], testing_plan: [], deployment_plan: [], risks: [],
  what_changed: "Initial specification.", output_prompt: "Build a budgeting app.",
};

describe("parseEngineResponse", () => {
  it("accepts a valid structured specification", () => {
    expect(parseEngineResponse(JSON.stringify(valid))).toEqual(valid);
  });
  it("rejects malformed JSON instead of falling back to raw text", () => {
    expect(() => parseEngineResponse("not json")).toThrow(InvalidGenerationResponseError);
  });
  it("rejects missing required fields", () => {
    expect(() => parseEngineResponse(JSON.stringify({ output_prompt: "Build it" }))).toThrow(InvalidGenerationResponseError);
  });
});
