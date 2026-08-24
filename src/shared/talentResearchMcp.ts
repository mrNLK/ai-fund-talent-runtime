/**
 * Talent-mode research MCP allowlist.
 *
 * Isolation stays on: hive workers still launch with --strict-mcp-config and
 * never inherit ~/.claude, Cursor plugins, Lever, mail, or calendar connectors.
 * This module is the only MCP that Talent mode may write into a worker's
 * per-session settings.json, and only for Talent Researcher.
 *
 * Secrets never live here. Header values are environment interpolations
 * (`${EXA_API_KEY}`). The main process injects the real keys onto that
 * agent's PTY env at spawn. Sider Scholar uses ChatGPT OAuth, not an API key.
 */

import {
  TALENT_SIDER_SCHOLAR_MCP_ID,
  TALENT_SIDER_SCHOLAR_MCP_URL,
  talentSiderScholarGuidance
} from './talentSiderScholar';

export const TALENT_RESEARCH_AGENT_ID = 'talent-researcher';

export type TalentResearchMcpServer = {
  type: 'http';
  url: string;
  headers?: Record<string, string>;
};

export interface TalentResearchMcpEntry {
  id: string;
  label: string;
  description: string;
  requiredEnv?: 'EXA_API_KEY' | 'PARALLEL_API_KEY';
  spec: TalentResearchMcpServer;
}

/** Public-web research only. No Lever, Gmail, calendar, or candidate-system MCP. */
export const TALENT_RESEARCH_MCP: readonly TalentResearchMcpEntry[] = [
  {
    id: 'exa',
    label: 'Exa public web',
    description: 'People, company, GitHub, and page discovery with direct source URLs.',
    requiredEnv: 'EXA_API_KEY',
    spec: {
      type: 'http',
      url: 'https://mcp.exa.ai/mcp?tools=web_search_exa,web_fetch_exa,web_search_advanced_exa',
      headers: { 'x-api-key': '${EXA_API_KEY}' }
    }
  },
  {
    id: 'parallel-search',
    label: 'Parallel search',
    description: 'Multi-query web search and excerpted evidence.',
    requiredEnv: 'PARALLEL_API_KEY',
    spec: {
      type: 'http',
      url: 'https://search.parallel.ai/mcp',
      headers: { Authorization: 'Bearer ${PARALLEL_API_KEY}' }
    }
  },
  {
    id: 'talent-parallel-research',
    label: 'Parallel research',
    description: 'Broader structured enrichment when search excerpts are not enough.',
    requiredEnv: 'PARALLEL_API_KEY',
    spec: {
      type: 'http',
      url: 'https://task-mcp.parallel.ai/mcp',
      headers: { Authorization: 'Bearer ${PARALLEL_API_KEY}' }
    }
  },
  {
    id: TALENT_SIDER_SCHOLAR_MCP_ID,
    label: 'Sider Scholar',
    description: 'Academic papers, arXiv, PubMed, and open-access lookup. OAuth, no API key.',
    spec: {
      type: 'http',
      url: TALENT_SIDER_SCHOLAR_MCP_URL
    }
  }
] as const;

export function isTalentResearchAgent(agentId: string | undefined): boolean {
  return agentId === TALENT_RESEARCH_AGENT_ID;
}

export function talentResearchMcpPermissionAllows(
  presentIds: readonly string[]
): string[] {
  return presentIds.map((id) => `mcp__${id}`);
}

/**
 * Build the Claude settings mcpServers map for one agent.
 * Omit a server when its key is missing so the worker does not call a dead tool.
 */
export function buildTalentResearchMcpServers(
  agentId: string | undefined,
  env: { EXA_API_KEY?: string; PARALLEL_API_KEY?: string } = {}
): Record<string, TalentResearchMcpServer> {
  if (!isTalentResearchAgent(agentId)) return {};
  const out: Record<string, TalentResearchMcpServer> = {};
  for (const entry of TALENT_RESEARCH_MCP) {
    if (entry.requiredEnv && !env[entry.requiredEnv]) continue;
    out[entry.id] = entry.spec;
  }
  return out;
}

export function talentResearchToolGuidance(hasExa: boolean, hasParallel: boolean): string {
  const sider = talentSiderScholarGuidance();
  if (!hasExa && !hasParallel) {
    return `RESEARCH TOOLS: Exa and Parallel are not available in this session (API keys missing). Use built-in WebSearch and WebFetch, cite direct public URLs, and write insufficient data when evidence is thin. ${sider}`;
  }
  const parts = [
    'RESEARCH TOOLS: Prefer the wired research MCP servers over built-in WebSearch.',
    hasExa
      ? 'Use exa (web_search_exa, web_search_advanced_exa, web_fetch_exa) for people, companies, GitHub, talks, and public pages.'
      : null,
    hasParallel
      ? 'Use parallel-search for multi-query evidence. Use talent-parallel-research only when search excerpts are not enough for a defensible claim.'
      : null,
    'Use talent-sider-scholar for papers and authorship checks.',
    sider,
    'Cite direct public URLs. Never use Lever, email, calendar, or other candidate-system tools.'
  ];
  return parts.filter(Boolean).join(' ');
}
