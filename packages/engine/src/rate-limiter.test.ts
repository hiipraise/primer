import { afterEach, describe, expect, it, vi } from "vitest";
import { getRateLimiter, RateLimiter } from "./rate-limiter";

afterEach(() => vi.unstubAllEnvs());

describe("development RateLimiter", () => {
  it("allows only the configured request count per key", () => {
    const limiter = new RateLimiter({ maxRequests: 1, windowMs: 60_000 });
    expect(limiter.check("client-a").allowed).toBe(true);
    expect(limiter.check("client-a").allowed).toBe(false);
    expect(limiter.check("client-b").allowed).toBe(true);
  });

  it("fails closed in production when Redis is not configured", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    expect(() => getRateLimiter()).toThrow("Upstash rate limiting is not configured.");
  });
});
