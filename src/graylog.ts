import { request } from "undici";

export type GraylogOpts = {
  url: string;            // e.g. https://graylog.example.com
  token: string;          // Graylog Personal Access Token (PAT)
  insecure?: boolean;     // disable TLS verification for self-signed setups
};

export async function glGet(path: string, opts: GraylogOpts, query?: Record<string,string|number>) {
  const u = new URL(path, opts.url);
  if (query) Object.entries(query).forEach(([k,v]) => u.searchParams.set(k, String(v)));
  const authCandidates = [
    Buffer.from(`token:${opts.token}`).toString("base64"),
    Buffer.from(`${opts.token}:token`).toString("base64"),
  ];
  const insecureAgent = opts.insecure ? new (await import("undici")).Agent({ connect: { rejectUnauthorized: false } }) : undefined;

  let lastStatus = 0;
  for (const auth of authCandidates) {
    const baseOptions = { headers: { Authorization: `Basic ${auth}`, "X-Requested-By": "mcp-graylog", Accept: "application/json" } } as const;
    const options = insecureAgent ? { ...baseOptions, dispatcher: insecureAgent } : baseOptions;
    const res = await request(u, options);
    lastStatus = res.statusCode;
    if (res.statusCode === 401) continue;
    if (res.statusCode >= 400) throw new Error(`Graylog ${res.statusCode} ${u}`);
    return await res.body.json();
  }
  throw new Error(`Graylog ${lastStatus || 401} ${u}`);
}

/** Example API: /api/search/universal/relative */
export async function searchRelative(q: {
  query: string; rangeSec: number; limit?: number; offset?: number; filter?: string;
}, opts: GraylogOpts) {
  return glGet("/api/search/universal/relative", opts, {
    query: q.query, range: q.rangeSec, limit: q.limit ?? 150, offset: q.offset ?? 0, filter: q.filter ?? ""
  });
}

/** Example API for stream: /api/streams/{id}/messages */
export async function streamMessages(streamId: string, q: { rangeSec: number; limit?: number }, opts: GraylogOpts) {
  return glGet(`/api/streams/${streamId}/messages`, opts, { limit: q.limit ?? 150, range: q.rangeSec });
}