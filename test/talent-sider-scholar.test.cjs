'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const {
  TALENT_ANALYST_AGENT_ID,
  TALENT_SIDER_SCHOLAR_APP_ID,
  TALENT_SIDER_SCHOLAR_MCP_ID,
  TALENT_SIDER_SCHOLAR_MCP_URL,
  TALENT_SIDER_SCHOLAR_WRITE_TOOLS,
  isTalentAnalystAgent,
  talentSiderScholarClaudeDenyPermissions,
  talentSiderScholarCodexToml,
  talentSiderScholarGuidance
} = loadTs('src/shared/talentSiderScholar.ts');

test('Sider Scholar is allowlisted for Candidate Analyst only', () => {
  assert.equal(TALENT_ANALYST_AGENT_ID, 'candidate-analyst');
  assert.equal(isTalentAnalystAgent('candidate-analyst'), true);
  assert.equal(isTalentAnalystAgent('talent-researcher'), false);
  assert.equal(isTalentAnalystAgent('god'), false);
  assert.equal(isTalentAnalystAgent('automation-engineer'), false);
});

test('Codex Sider stanza enables only the Scholar app and never copies connectors', () => {
  const toml = talentSiderScholarCodexToml();
  assert.match(toml, new RegExp(`\\[apps\\.${TALENT_SIDER_SCHOLAR_APP_ID}\\]`));
  assert.match(toml, /enabled = true/);
  assert.doesNotMatch(toml, /lever/i);
  assert.doesNotMatch(toml, /gmail|gsuite|calendar/i);
  assert.doesNotMatch(toml, /supabase/i);
  assert.doesNotMatch(toml, /mcp_servers/);
  assert.doesNotMatch(toml, /API_KEY|Bearer|eyJ/);
});

test('Claude Sider MCP is the public Scholar URL with write tools denied', () => {
  assert.equal(TALENT_SIDER_SCHOLAR_MCP_ID, 'talent-sider-scholar');
  assert.equal(TALENT_SIDER_SCHOLAR_MCP_URL, 'https://scholar.chatgptapps.sider.ai/mcp');
  assert.deepEqual([...TALENT_SIDER_SCHOLAR_WRITE_TOOLS].sort(), [
    'prepare_chat_for_saving',
    'wisebase_upload'
  ]);
  assert.deepEqual(talentSiderScholarClaudeDenyPermissions([]), []);
  const denied = talentSiderScholarClaudeDenyPermissions(['talent-exa', 'talent-sider-scholar']);
  assert.ok(denied.includes('mcp__talent-sider-scholar__wisebase_upload'));
  assert.ok(denied.includes('mcp__talent-sider-scholar__prepare_chat_for_saving'));
});

test('Sider guidance forbids Wisebase writes and candidate-system tools', () => {
  const text = talentSiderScholarGuidance();
  assert.match(text, /Sider Scholar/);
  assert.match(text, /Wisebase/);
  assert.match(text, /Never use Lever/);
  assert.match(text, /insufficient data/);
});
