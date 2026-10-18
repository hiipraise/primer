import { describe, expect, it } from "vitest";
import { generateBodySchema, generationsQuerySchema, publishBodySchema } from "./validation";

describe("API schemas", () => {
  it("caps generation input at 4,000 characters and validates formats", () => {
    expect(generateBodySchema.safeParse({ input: "idea", format: "cursor" }).success).toBe(true);
    expect(generateBodySchema.safeParse({ input: "x".repeat(4001) }).success).toBe(false);
    expect(generateBodySchema.safeParse({ input: "idea", format: "unknown" }).success).toBe(false);
  });

  it("requires a valid session UUID and positive version", () => {
    expect(generationsQuerySchema.safeParse({ session_id: "not-a-uuid" }).success).toBe(false);
    expect(generationsQuerySchema.safeParse({ session_id: "07c841f1-95d6-46e5-9775-ec464a4bf309", version: "0" }).success).toBe(false);
  });

  it("only accepts a boolean publish flag", () => {
    expect(publishBodySchema.safeParse({ is_public: false }).success).toBe(true);
    expect(publishBodySchema.safeParse({ is_public: "false" }).success).toBe(false);
  });
});
