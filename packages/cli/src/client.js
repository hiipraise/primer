import { parseArgs } from "./args.js";

const usage = "Usage: primer generate --input \"Project idea\" [--format generic|claude-code|cursor|windsurf|v0] [--region global|nigeria|squad] [--low-bandwidth] [--json]\nSet PRIMER_API_KEY and optionally PRIMER_API_URL.";

export async function runCli(args, env = process.env, fetcher = fetch) {
  try {
    const command = args[0];
    if (command === "--help" || command === "-h") return { status: 0, output: usage };
    if (command !== "generate") return { status: 2, output: usage };
    const options = parseArgs(args.slice(1));
    if (options.input === "__HELP__") return { status: 0, output: usage };
    if (!options.input.trim() || options.input.length > 4000) return { status: 2, output: "Provide an input of 1 to 4,000 characters.\n" + usage };
    if (!env.PRIMER_API_KEY) return { status: 2, output: "PRIMER_API_KEY is required." };
    const baseUrl = (env.PRIMER_API_URL ?? "https://primer.build").replace(/\/$/, "");
    const response = await fetcher(baseUrl + "/api/v1/generate", {
      method: "POST",
      headers: { Authorization: "Bearer " + env.PRIMER_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ input: options.input, format: options.format, region: options.region, low_bandwidth: options.lowBandwidth }),
    });
    const body = await response.json();
    if (!response.ok) return { status: 1, output: typeof body.error === "string" ? body.error : `Request failed (${response.status}).` };
    return { status: 0, output: options.json ? JSON.stringify(body, null, 2) : String(body.prompt ?? "") };
  } catch (error) {
    return { status: 1, output: error instanceof Error ? error.message : "Primer request failed." };
  }
}
