import { describe, expect, it } from "vitest";
import { attachAnonCookie, getClientIp, sessionOwner } from "./request-identity";

describe("request identity helpers", () => {
  it("uses platform IP headers and ignores untrusted x-forwarded-for", () => {
    const request = new Request("https://primer.test", {
      headers: { "x-forwarded-for": "spoofed", "x-real-ip": "192.0.2.1" },
    });
    expect(getClientIp(request)).toBe("192.0.2.1");
    const vercelRequest = new Request("https://primer.test", {
      headers: { "x-vercel-forwarded-for": "198.51.100.8, 192.0.2.1", "x-real-ip": "192.0.2.1" },
    });
    expect(getClientIp(vercelRequest)).toBe("198.51.100.8");
  });

  it("sets a server-only anonymous cookie when a request omitted one", () => {
    const response = attachAnonCookie(new Response(null), "cookie-id", true);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).toContain("SameSite=Lax");
  });

  it("uses the authenticated user or anonymous cookie as the session owner", () => {
    expect(sessionOwner({ userId: "user-1", anonCookieId: "cookie-1" })).toEqual({ userId: "user-1" });
    expect(sessionOwner({ userId: null, anonCookieId: "cookie-1" })).toEqual({ userId: null, anonCookieId: "cookie-1" });
    expect(sessionOwner({ userId: null, anonCookieId: null })).toBeNull();
  });
});
