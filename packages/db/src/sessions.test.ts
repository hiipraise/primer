import { describe, expect, it } from "vitest";
import { getCookieValue } from "./sessions";

describe("getCookieValue", () => {
  it("returns the requested cookie value", () => {
    expect(getCookieValue("first=1; primer_anon_id=abc123; last=3", "primer_anon_id")).toBe("abc123");
  });

  it("returns null when the header or cookie is missing", () => {
    expect(getCookieValue(null, "primer_anon_id")).toBeNull();
    expect(getCookieValue("first=1", "primer_anon_id")).toBeNull();
  });
});
