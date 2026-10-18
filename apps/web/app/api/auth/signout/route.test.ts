import { beforeEach, describe, expect, it, vi } from "vitest";

const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }));
vi.mock("@primer/db", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { signOut } })),
}));

import { POST } from "./route";

describe("POST /api/auth/signout", () => {
  beforeEach(() => signOut.mockReset());

  it("signs out and returns success", async () => {
    signOut.mockResolvedValue({ error: null });
    const response = await POST();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ signed_out: true });
    expect(signOut).toHaveBeenCalledOnce();
  });
});
