#!/usr/bin/env node
import "dotenv/config";
import yargs from "yargs/yargs"; 
import { hideBin } from "yargs/helpers";
import { makeServer } from "./server.js";

const argv = await yargs(hideBin(process.argv))
  .option("graylog-url", { type: "string", demandOption: true })
  .option("token",       { type: "string", demandOption: true })
  .option("ssl-verify",  { type: "boolean", default: true })
  .option("debug",       { type: "boolean", default: false })
  .parse();

const server = makeServer({
  url: argv["graylog-url"],
  token: argv.token,
  insecure: argv["ssl-verify"] === false
});

// stdio transport for MCP clients (Cursor-compatible)
await server.connectStdio();

if (argv.debug) console.error("[graylog-mcp] started via stdio");