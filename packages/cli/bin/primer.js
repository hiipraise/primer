#!/usr/bin/env node
import { runCli } from "../src/client.js";

const result = await runCli(process.argv.slice(2));
if (result.output) (result.status === 0 ? process.stdout : process.stderr).write(result.output + "\n");
process.exitCode = result.status;
