## graylog-mcp

Minimal MCP server that exposes Graylog search as tools over stdio. Works with Cursor and other MCP clients.

### Requirements
- Node.js >= 18

### Install (from npm)
```bash
npm i -g @alexbuzo/graylog-mcp
# then a CLI named `graylog-mcp` is available
```

### Run (manual)
```bash
graylog-mcp \
  --graylog-url https://graylog.example.com \
  --token YOUR_GRAYLOG_PAT \
  --ssl-verify=false
```

### Use in Cursor (MCP Servers)
Settings → MCP Servers → Add custom server.

Auto-run via npx (recommended):
```json
{
  "mcpServers": {
    "graylog": {
      "command": "npx",
      "args": [
        "-y",
        "@alexbuzo/graylog-mcp@latest",
        "--graylog-url", "https://graylog.example.com",
        "--token", "YOUR_GRAYLOG_PAT",
        "--ssl-verify", "false"
      ],
      "name": "Graylog (npx)"
    }
  }
}
```

With environment variables (keeps token out of args):
```json
{
  "mcpServers": {
    "graylog": {
      "command": "bash",
      "args": [
        "-lc",
        "npx -y @alexbuzo/graylog-mcp@latest --graylog-url \"$GRAYLOG_URL\" --token \"$GRAYLOG_TOKEN\" --ssl-verify=false"
      ],
      "env": {
        "GRAYLOG_URL": "https://graylog.example.com",
        "GRAYLOG_TOKEN": "YOUR_GRAYLOG_PAT"
      },
      "name": "Graylog (npx, env)"
    }
  }
}
```

Notes:
- For self‑signed TLS, keep `--ssl-verify=false`. Prefer a valid CA in production.
- Personal Access Token (PAT) must have permission to read target streams. The server tries both `token:<PAT>` and `<PAT>:token` formats.
- You can also install globally and use `command: "graylog-mcp"` if preferred.

### Tools
- `graylog.search_logs`
  - Args: `{ query: string, rangeSec: number, limit?: number, offset?: number, filter?: string }`
  - Example: `query: "level:ERROR"`, `rangeSec: 3600`, `filter: "stream:<STREAM_ID>"`

- `graylog.search_stream`
  - Args: `{ streamId: string, rangeSec: number, limit?: number }`

Both tools return a compact JSON in `content.text` with `total` and `messages`.

### Local development
```bash
npm i
npm run build
node dist/cli.js --graylog-url https://graylog.example.com --token YOUR_GRAYLOG_PAT --ssl-verify=false
```

### Troubleshooting
- 401/403: invalid PAT or insufficient permissions to search/stream.
- TLS errors: use `--ssl-verify=false` or set `NODE_EXTRA_CA_CERTS` to a trusted CA.
- No results: try `query: "*"` and verify selected streams/time window.

### License
MIT


