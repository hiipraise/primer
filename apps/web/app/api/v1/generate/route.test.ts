import { beforeEach, describe, expect, it, vi } from "vitest";

const { findKey, rateLimit, generate } = vi.hoisted(() => ({
  findKey: vi.fn(), rateLimit: vi.fn(), generate: vi.fn(),
}));
vi.mock("@primer/db", () => ({ findActivePrimerApiKey: findKey }));
vi.mock("@primer/engine", () => ({
  getEngine: () => ({ checkRateLimit: rateLimit, generate }),
  RateLimitError: class RateLimitError extends Error { retryAfter = 30; resetAt = Date.now() + 30_000; },
}));

import { POST } from "./route";

describe("POST /api/v1/generate", () => {
  beforeEach(() => { findKey.mockReset(); rateLimit.mockReset(); generate.mockReset(); });

  it("rejects a missing bearer key before looking up secrets", async () => {
    const response = await POST(new Request("https://primer.test/api/v1/generate", { method: "POST", body: JSON.stringify({ input: "Build an app" }) }));
    expect(response.status).toBe(401);
    expect(findKey).not.toHaveBeenCalled();
  });

  it("validates keys and rate limits independently before generation", async () => {
    findKey.mockResolvedValue({ id: "key-123" });
    rateLimit.mockResolvedValue(undefined);
    generate.mockResolvedValue({ prompt: "Brief", stack: [], tools: [], skills: [], spec: {}, files: [], format: "generic", change_summary: "" });
    const response = await POST(new Request("https://primer.test/api/v1/generate", {
      method: "POST",
      headers: { Authorization: "Bearer pr_live_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", "Content-Type": "application/json" },
      body: JSON.stringify({ input: "Build a clinic app", region: "nigeria", low_bandwidth: true }),
    }));
    expect(response.status).toBe(200);
    expect(rateLimit).toHaveBeenCalledWith("api-key:key-123");
    expect(generate).toHaveBeenCalledWith(expect.objectContaining({ rateLimitChecked: true, input: expect.stringContaining("nigeria") }));
  });
});
