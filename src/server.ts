import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { GraylogOpts } from "./graylog.js";
import { searchRelative, streamMessages } from "./graylog.js";

export function makeServer(opts: GraylogOpts) {
  const server = new McpServer(
    { name: "graylog-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  // tool: search logs for the last N seconds
  server.registerTool(
    "graylog.search_logs",
    {
      description: "Search logs (relative) by query and time window (seconds).",
      inputSchema: {
        query: z.string().describe('Graylog Lucene/GELF query'),
        rangeSec: z.number().int().positive().default(3600),
        limit: z.number().int().positive().max(500).optional(),
        offset: z.number().int().min(0).optional(),
        filter: z.string().optional(),
      }
    },
    async ({ query, rangeSec, limit, offset, filter }) => {
      const params: { query: string; rangeSec: number; limit?: number; offset?: number; filter?: string } = { query, rangeSec };
      if (typeof limit === 'number') params.limit = limit;
      if (typeof offset === 'number') params.offset = offset;
      if (typeof filter === 'string') params.filter = filter;
      const res = await searchRelative(params, opts);
      // normalize response to a compact shape
      const r: any = res as any;
      const messages = (r?.messages ?? []).map((m: any) => ({
        id: m.message?._id,
        ts: m.message?.timestamp,
        level: m.message?.level,
        source: m.message?.source,
        short_message: m.message?.short_message,
      }));
      return { content: [{ type: "text", text: JSON.stringify({ total: r.total_results, messages }, null, 2) }] };
    }
  );

  // tool: messages for a specific stream
  server.registerTool(
    "graylog.search_stream",
    {
      description: "Messages for a given streamId for the last N seconds.",
      inputSchema: {
        streamId: z.string(),
        rangeSec: z.number().int().positive().default(3600),
        limit: z.number().int().positive().max(500).optional()
      }
    },
    async ({ streamId, rangeSec, limit }) => {
      const params: { rangeSec: number; limit?: number } = { rangeSec };
      if (typeof limit === 'number') params.limit = limit;
      const res = await streamMessages(streamId, params, opts);
      const r: any = res as any;
      const messages = (r?.messages ?? []).map((m: any) => ({
        id: m.message?._id, ts: m.message?.timestamp, source: m.message?.source, short_message: m.message?.short_message
      }));
      return { content: [{ type: "text", text: JSON.stringify({ messages }, null, 2) }] };
    }
  );

  // Ensure clients see tools immediately after initialization
  // (some clients rely on this notification to refresh tool list)
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  (server as any).server.oninitialized = async () => {
    server.sendToolListChanged();
  };

  return {
    connectStdio: async () => server.connect(new StdioServerTransport())
  };
}