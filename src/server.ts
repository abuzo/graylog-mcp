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
        container: m.message?.container ?? m.message?.container_name ?? m.message?.["kubernetes.container_name"],
        short_message: m.message?.short_message,
        message: m.message?.message ?? m.message?.full_message ?? m.message?.short_message,
        request: m.message?.request ?? m.message?.http_request ?? m.message?.req ?? m.message?.request_body,
        response: m.message?.response ?? m.message?.http_response ?? m.message?.res ?? m.message?.response_body,
        http_method: m.message?.method ?? m.message?.http_method ?? m.message?.request_method,
        url: m.message?.url ?? m.message?.path ?? m.message?.request_path,
        status: m.message?.status ?? m.message?.http_status ?? m.message?.response_status,
        latency_ms: m.message?.latency_ms ?? m.message?.duration_ms ?? m.message?.response_time_ms,
        trace_id: m.message?.traceId ?? m.message?.trace_id ?? m.message?.["trace.id"],
        span_id: m.message?.spanId ?? m.message?.span_id ?? m.message?.["span.id"],
        request_id: m.message?.request_id ?? m.message?.req_id ?? m.message?.requestId,
        tenant_id: m.message?.tenant_id ?? m.message?.tenantId ?? m.message?.tenant,
        client_ip: m.message?.client_ip ?? m.message?.remote_addr ?? m.message?.ip,
        user_agent: m.message?.user_agent ?? m.message?.agent,
        service: m.message?.service ?? m.message?.service_name ?? m.message?.app,
      }));
      return { content: [{ type: "text", text: JSON.stringify({ total: r.total_results, messages }, null, 2) }] };
    }
  );

  // tool: smart UUID search - tries multiple fields
  server.registerTool(
    "graylog.search_uuid",
    {
      description: "Smart search for UUID across common fields (request_id, trace_id, etc.). Automatically tries multiple field names.",
      inputSchema: {
        uuid: z.string().describe('UUID to search for'),
        rangeSec: z.number().int().positive().default(86400),
        limit: z.number().int().positive().max(500).optional(),
      }
    },
    async ({ uuid, rangeSec, limit }) => {
      const fields = [
        'request_id', 'requestId', 'req_id',
        'trace_id', 'traceId', 'trace.id',
        'span_id', 'spanId', 'span.id',
        'transaction_id', 'transactionId',
        'correlation_id', 'correlationId',
        '_id'
      ];
      
      const queries = fields.map(f => `${f}:${uuid}`);
      const fullQuery = queries.join(' OR ');
      
      const params = { query: fullQuery, rangeSec, limit: limit ?? 200 };
      const res = await searchRelative(params, opts);
      const r: any = res as any;
      const messages = (r?.messages ?? []).map((m: any) => ({
        id: m.message?._id,
        ts: m.message?.timestamp,
        level: m.message?.level,
        source: m.message?.source,
        container: m.message?.container ?? m.message?.container_name ?? m.message?.["kubernetes.container_name"],
        message: m.message?.message ?? m.message?.full_message ?? m.message?.short_message,
        request: m.message?.request ?? m.message?.http_request ?? m.message?.req ?? m.message?.request_body,
        response: m.message?.response ?? m.message?.http_response ?? m.message?.res ?? m.message?.response_body,
        http_method: m.message?.method ?? m.message?.http_method ?? m.message?.request_method,
        url: m.message?.url ?? m.message?.path ?? m.message?.request_path,
        status: m.message?.status ?? m.message?.http_status ?? m.message?.response_status,
        latency_ms: m.message?.latency_ms ?? m.message?.duration_ms ?? m.message?.response_time_ms,
        trace_id: m.message?.traceId ?? m.message?.trace_id ?? m.message?.["trace.id"],
        span_id: m.message?.spanId ?? m.message?.span_id ?? m.message?.["span.id"],
        request_id: m.message?.request_id ?? m.message?.req_id ?? m.message?.requestId,
        tenant_id: m.message?.tenant_id ?? m.message?.tenantId ?? m.message?.tenant,
        client_ip: m.message?.client_ip ?? m.message?.remote_addr ?? m.message?.ip,
        user_agent: m.message?.user_agent ?? m.message?.agent,
        service: m.message?.service ?? m.message?.service_name ?? m.message?.app,
      }));
      return { content: [{ type: "text", text: JSON.stringify({ total: r.total_results, messages, query_used: fullQuery }, null, 2) }] };
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
        id: m.message?._id,
        ts: m.message?.timestamp,
        source: m.message?.source,
        container: m.message?.container ?? m.message?.container_name ?? m.message?.["kubernetes.container_name"],
        short_message: m.message?.short_message,
        message: m.message?.message ?? m.message?.full_message ?? m.message?.short_message,
        request: m.message?.request ?? m.message?.http_request ?? m.message?.req ?? m.message?.request_body,
        response: m.message?.response ?? m.message?.http_response ?? m.message?.res ?? m.message?.response_body,
        http_method: m.message?.method ?? m.message?.http_method ?? m.message?.request_method,
        url: m.message?.url ?? m.message?.path ?? m.message?.request_path,
        status: m.message?.status ?? m.message?.http_status ?? m.message?.response_status,
        latency_ms: m.message?.latency_ms ?? m.message?.duration_ms ?? m.message?.response_time_ms,
        trace_id: m.message?.traceId ?? m.message?.trace_id ?? m.message?.["trace.id"],
        span_id: m.message?.spanId ?? m.message?.span_id ?? m.message?.["span.id"],
        request_id: m.message?.request_id ?? m.message?.req_id ?? m.message?.requestId,
        tenant_id: m.message?.tenant_id ?? m.message?.tenantId ?? m.message?.tenant,
        client_ip: m.message?.client_ip ?? m.message?.remote_addr ?? m.message?.ip,
        user_agent: m.message?.user_agent ?? m.message?.agent,
        service: m.message?.service ?? m.message?.service_name ?? m.message?.app,
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