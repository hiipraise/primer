import { describe, expect, it } from "vitest";
import { sanitizeNextPath } from "./redirect";

describe("sanitizeNextPath", () => {
  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "/path/https://evil.example", "settings"])(
    "rejects unsafe redirect %s",
    (next) => expect(sanitizeNextPath(next)).toBe("/"),
  );

  it("keeps a local absolute path and its query", () => {
    expect(sanitizeNextPath("/settings?tab=profile")).toBe("/settings?tab=profile");
  });
});
