export function parseArgs(args) {
  const options = { input: "", format: "generic", region: "global", lowBandwidth: false, json: false };
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if ((arg === "--input" || arg === "-i") && args[index + 1]) options.input = args[++index];
    else if (arg === "--format" && args[index + 1]) options.format = args[++index];
    else if (arg === "--region" && args[index + 1]) options.region = args[++index];
    else if (arg === "--low-bandwidth") options.lowBandwidth = true;
    else if (arg === "--json") options.json = true;
    else if (arg === "--help" || arg === "-h") return { ...options, input: "__HELP__" };
    else throw new Error(`Unknown or incomplete option: ${arg}`);
  }
  return options;
}
