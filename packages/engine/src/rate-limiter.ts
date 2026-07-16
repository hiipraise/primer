import type { RateLimitConfig, RateLimitResult } from "./types";

// ─── Defaults ────────────────────────────────────────────────────────
const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

// ─── In-memory sliding window rate limiter ───────────────────────────
// This is suitable for single-instance deployments (like Vercel's
// serverless functions). For multi-region or production scale, swap
// this for a Supabase or Upstash Redis-based implementation.
export class RateLimiter {
  private config: RateLimitConfig;
  /** Map<ip, Array<timestamp_ms>> */
  private hits = new Map<string, number[]>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    // Clean up stale entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    // Allow the process to exit cleanly
    if (typeof process !== "undefined" && process.on) {
      process.on("beforeExit", () => {
        this.destroy();
      });
    }
  }

  /** Check if a request from this IP is allowed */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get existing hits for this key, filter out stale ones
    const existing = this.hits.get(key) ?? [];
    const recent = existing.filter((ts) => ts > windowStart);

    if (recent.length >= this.config.maxRequests) {
      // Rate limited — find when the window resets
      const oldest = recent[0];
      return {
        allowed: false,
        remaining: 0,
        resetAt: oldest + this.config.windowMs,
      };
    }

    // Record this hit
    recent.push(now);
    this.hits.set(key, recent);

    return {
      allowed: true,
      remaining: this.config.maxRequests - recent.length,
      resetAt: now + this.config.windowMs,
    };
  }

  /** Reset rate limit for a specific key (useful for testing) */
  reset(key: string): void {
    this.hits.delete(key);
  }

  /** Clean up old entries to prevent memory leaks */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    for (const [key, timestamps] of this.hits) {
      const recent = timestamps.filter((ts) => ts > windowStart);
      if (recent.length === 0) {
        this.hits.delete(key);
      } else {
        this.hits.set(key, recent);
      }
    }
  }

  /** Clean up the interval on shutdown */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.hits.clear();
  }
}

// ─── Singleton ───────────────────────────────────────────────────────
let globalLimiter: RateLimiter | null = null;

export function getRateLimiter(
  config?: Partial<RateLimitConfig>
): RateLimiter {
  if (!globalLimiter) {
    globalLimiter = new RateLimiter(config);
  }
  return globalLimiter;
}
