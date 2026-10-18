import { describe, expect, it, vi } from "vitest";
import { parseArgs } from "./args.js";
import { runCli } from "./client.js";

describe("Primer CLI", () => {
  it("parses options used for regional generation", () => {
    expect(parseArgs(["-i", "Build a clinic app", "--region", "nigeria", "--low-bandwidth"])).toMatchObject({ input: "Build a clinic app", region: "nigeria", lowBandwidth: true });
  });

  it("requires an API key before making a request", async () => {
    const fetcher = vi.fn();
    expect(await runCli(["generate", "--input", "Build an app"], {}, fetcher)).toMatchObject({ status: 2 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("calls the public endpoint and prints the generated brief", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ prompt: "A concise brief" }), { status: 200 }));
    const result = await runCli(["generate", "--input", "Build a clinic app", "--region", "nigeria", "--low-bandwidth"], { PRIMER_API_KEY: "test-key", PRIMER_API_URL: "https://example.test/" }, fetcher);
    expect(result).toEqual({ status: 0, output: "A concise brief" });
    expect(fetcher).toHaveBeenCalledWith("https://example.test/api/v1/generate", expect.objectContaining({
      headers: expect.objectContaining({ Authorization: "Bearer test-key" }),
      body: JSON.stringify({ input: "Build a clinic app", format: "generic", region: "nigeria", low_bandwidth: true }),
    }));
  });
});
