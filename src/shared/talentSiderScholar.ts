/**
 * Sider Scholar wiring for Talent mode.
 *
 * This is a ChatGPT / Codex Apps SDK app, not an API-key HTTP connector.
 * Candidate Analyst (Codex) gets the isolated `[apps.<id>]` stanza.
 * Talent Researcher (Claude) gets the public Streamable HTTP MCP URL.
 * Neither path copies Lever, mail, calendar, or the user's ~/.codex connectors.
 *
 * Wisebase upload and chat-save tools write to Sider's knowledge base.
 * They stay denied.
 */

export const TALENT_ANALYST_AGENT_ID = 'candidate-analyst';
export const TALENT_SIDER_SCHOLAR_MCP_ID = 'talent-sider-scholar';
export const TALENT_SIDER_SCHOLAR_APP_ID = 'asdk_app_6948b485f5bc8191adb4df13f369cec7';
export const TALENT_SIDER_SCHOLAR_MCP_URL = 'https://scholar.chatgptapps.sider.ai/mcp';

export const TALENT_SIDER_SCHOLAR_READ_TOOLS = [
  'scholar_search',
  'advanced_search',
  'arxiv_search',
  'arxiv_work_info',
  'pubmed_search',
  'pubmed_work_info',
  'biorxiv_search',
  'biorxiv_work_info',
  'search_open_access_works',
  'smart_open_access_search',
  'get_open_access_work',
  'knowledge_graph',
  'knowledge_graph_list'
] as const;

export const TALENT_SIDER_SCHOLAR_WRITE_TOOLS = [
  'wisebase_upload',
  'prepare_chat_for_saving'
] as const;

export function isTalentAnalystAgent(agentId: string | undefined): boolean {
  return agentId === TALENT_ANALYST_AGENT_ID;
}

/** Isolated Codex worker fragment. Regenerated from scratch; never copy user config. */
export function talentSiderScholarCodexToml(): string {
  return [
    '',
    '# Sider Scholar ChatGPT app. Paper search only. Do not copy other apps or MCP connectors.',
    `[apps.${TALENT_SIDER_SCHOLAR_APP_ID}]`,
    'enabled = true',
    ''
  ].join('\n');
}

export function talentSiderScholarClaudeDenyPermissions(
  presentIds: readonly string[]
): string[] {
  if (!presentIds.includes(TALENT_SIDER_SCHOLAR_MCP_ID)) return [];
  return TALENT_SIDER_SCHOLAR_WRITE_TOOLS.flatMap((tool) => [
    `mcp__${TALENT_SIDER_SCHOLAR_MCP_ID}__${tool}`,
    `mcp__${TALENT_SIDER_SCHOLAR_MCP_ID}__sider_scholar.${tool}`
  ]);
}

export function talentSiderScholarGuidance(): string {
  return [
    'PAPER TOOLS: Use Sider Scholar for publications, arXiv, PubMed, bioRxiv, and open-access lookup when checking research-backed profiles.',
    'Authorship and papers are not hands-on GenAI evidence. The GenAI floor still applies.',
    'Do not upload to Wisebase, save collections, or write to any Sider knowledge base.',
    'If Sider asks to reauthenticate or tools are missing, write insufficient data for papers instead of inventing them.',
    'Cite paper URLs. Never use Lever, email, calendar, or other candidate-system tools.'
  ].join(' ');
}
