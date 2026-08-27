#!/bin/bash
set -euo pipefail
HIVE="$HOME/AI Fund Talent Runtime/hive"
AGENT_DIR="$HIVE/agents/talent-researcher"
: "${EXA_API_KEY:?Set EXA_API_KEY in this shell first}"
: "${PARALLEL_API_KEY:?Set PARALLEL_API_KEY in this shell first}"
if [ ! -d "$HIVE" ]; then
  echo "Hive not found at: $HIVE" >&2
  exit 1
fi
mkdir -p "$AGENT_DIR"
if [ -f "$AGENT_DIR/.mcp.json" ]; then
  cp "$AGENT_DIR/.mcp.json" "$AGENT_DIR/.mcp.json.bak.$(date +%Y%m%d%H%M%S)"
fi
cat > "$AGENT_DIR/.mcp.json" <<JSON
{
  "mcpServers": {
    "exa": {
      "type": "http",
      "url": "https://mcp.exa.ai/mcp",
      "headers": { "x-api-key": "${EXA_API_KEY}" }
    },
    "parallel-search": {
      "type": "http",
      "url": "https://search.parallel.ai/mcp",
      "headers": { "Authorization": "Bearer ${PARALLEL_API_KEY}" }
    }
  }
}
JSON
echo "Wrote $AGENT_DIR/.mcp.json"
