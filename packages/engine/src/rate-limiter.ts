import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { RateLimitConfig, RateLimitResult } from "./types";

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 15 * 60 * 1000,
};

export interface RateLimiterAdapter {
  check(key: string): RateLimitResult | Promise<RateLimitResult>;
}

/** In-memory rate limiting is deliberately restricted to local development. */
export class RateLimiter implements RateLimiterAdapter {
  private config: RateLimitConfig;
  private hits = new Map<string, number[]>();
  private checks = 0;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  check(key: string): RateLimitResult {
    const now = Date.now();
    this.checks += 1;
    if (this.checks % 100 === 0) this.cleanup(now);
    const recent = (this.hits.get(key) ?? []).filter(
      (timestamp) => timestamp > now - this.config.windowMs,
    );
    if (recent.length >= this.config.maxRequests) {
      return { allowed: false, remaining: 0, resetAt: recent[0] + this.config.windowMs };
    }
    recent.push(now);
    this.hits.set(key, recent);
    return {
      allowed: true,
      remaining: this.config.maxRequests - recent.length,
      resetAt: now + this.config.windowMs,
    };
  }

  reset(key: string): void {
    this.hits.delete(key);
  }

  private cleanup(now: number): void {
    const windowStart = now - this.config.windowMs;
    for (const [key, timestamps] of this.hits) {
      const recent = timestamps.filter((timestamp) => timestamp > windowStart);
      if (recent.length) this.hits.set(key, recent);
      else this.hits.delete(key);
    }
  }
}

class UpstashRateLimiter implements RateLimiterAdapter {
  private limiter: Ratelimit;

  constructor(config: Partial<RateLimitConfig> = {}) {
    const resolved = { ...DEFAULT_CONFIG, ...config };
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) throw new Error("Upstash rate limiting is not configured.");
    this.limiter = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(
        resolved.maxRequests,
        `${Math.ceil(resolved.windowMs / 1000)} s`,
      ),
      prefix: "primer:generate",
    });
  }

  async check(key: string): Promise<RateLimitResult> {
    const { success, remaining, reset } = await this.limiter.limit(key);
    return { allowed: success, remaining, resetAt: reset };
  }
}

let globalLimiter: RateLimiterAdapter | null = null;

export function getRateLimiter(
  config?: Partial<RateLimitConfig>,
): RateLimiterAdapter {
  if (!globalLimiter) {
    globalLimiter = process.env.NODE_ENV === "development"
      ? new RateLimiter(config)
      : new UpstashRateLimiter(config);
  }
  return globalLimiter;
}
