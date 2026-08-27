'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const {
  TALENT_RESEARCH_MCP,
  TALENT_RESEARCH_AGENT_ID,
  buildTalentResearchMcpServers,
  isTalentResearchAgent,
  talentResearchMcpPermissionAllows,
  talentResearchToolGuidance
} = loadTs('src/shared/talentResearchMcp.ts');

const {
  loadTalentResearchSecrets,
  talentResearchSecretCandidateFiles
} = loadTs('src/main/talentResearchSecrets.ts');

test('only Talent Researcher is on the research MCP allowlist', () => {
  assert.equal(TALENT_RESEARCH_AGENT_ID, 'talent-researcher');
  assert.equal(isTalentResearchAgent('talent-researcher'), true);
  assert.equal(isTalentResearchAgent('god'), false);
  assert.equal(isTalentResearchAgent('candidate-analyst'), false);
  assert.equal(isTalentResearchAgent('automation-engineer'), false);
});

test('research MCP is public-web only: Exa, Parallel, and Sider Scholar, never Lever or mail', () => {
  const blob = JSON.stringify(TALENT_RESEARCH_MCP);
  assert.match(blob, /mcp\.exa\.ai/);
  assert.match(blob, /search\.parallel\.ai/);
  assert.match(blob, /task-mcp\.parallel\.ai/);
  assert.match(blob, /scholar\.chatgptapps\.sider\.ai\/mcp/);
  assert.doesNotMatch(blob, /lever/i);
  assert.doesNotMatch(blob, /gmail|gsuite|calendar/i);
  assert.doesNotMatch(blob, /supabase/i);
  for (const entry of TALENT_RESEARCH_MCP) {
    assert.equal(entry.spec.type, 'http');
    if (!entry.requiredEnv) assert.equal(entry.spec.headers, undefined);
  }
  assert.equal(TALENT_RESEARCH_MCP.find((entry) => entry.id === 'exa').spec.headers['x-api-key'], '${EXA_API_KEY}');
  assert.equal(TALENT_RESEARCH_MCP.find((entry) => entry.id === 'parallel-search').spec.headers.Authorization, 'Bearer ${PARALLEL_API_KEY}');
});

test('research MCP servers are omitted without keys and for other agents', () => {
  assert.deepEqual(buildTalentResearchMcpServers('god', {
    EXA_API_KEY: 'exa-test-key-value',
    PARALLEL_API_KEY: 'parallel-test-key-value'
  }), {});
  const noKeys = buildTalentResearchMcpServers('talent-researcher', {});
  assert.deepEqual(Object.keys(noKeys), ['talent-sider-scholar']);
  assert.equal(noKeys['talent-sider-scholar'].headers, undefined);
  const wired = buildTalentResearchMcpServers('talent-researcher', {
    EXA_API_KEY: 'exa-test-key-value',
    PARALLEL_API_KEY: 'parallel-test-key-value'
  });
  assert.deepEqual(Object.keys(wired).sort(), [
    'exa',
    'parallel-search',
    'talent-parallel-research',
    'talent-sider-scholar'
  ]);
  assert.equal(wired.exa.headers['x-api-key'], '${EXA_API_KEY}');
  assert.deepEqual(
    talentResearchMcpPermissionAllows(Object.keys(wired)).sort(),
    [
      'mcp__exa',
      'mcp__parallel-search',
      'mcp__talent-parallel-research',
      'mcp__talent-sider-scholar'
    ]
  );
});

test('guidance names wired tools and forbids candidate-system tools', () => {
  const both = talentResearchToolGuidance(true, true);
  assert.match(both, /Use exa/);
  assert.match(both, /parallel-search/);
  assert.match(both, /talent-sider-scholar/);
  assert.match(both, /Never use Lever/);
  const none = talentResearchToolGuidance(false, false);
  assert.match(none, /API keys missing/);
  assert.match(none, /Sider Scholar/);
});

test('secret loader reads only Exa and Parallel names from a dotenv file', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'talent-secrets-'));
  const file = path.join(dir, 'research.env');
  fs.writeFileSync(file, [
    'EXA_API_KEY="exa-from-file-key"',
    'PARALLEL_API_KEY=parallel-from-file-key',
    'LEVER_API_KEY=must-not-load',
    'GOOGLE_CLIENT_SECRET=must-not-load'
  ].join('\n'));
  const loaded = loadTalentResearchSecrets(
    { AI_FUND_TALENT_SECRETS: file },
    path.join(dir, 'no-home')
  );
  assert.equal(loaded.EXA_API_KEY, 'exa-from-file-key');
  assert.equal(loaded.PARALLEL_API_KEY, 'parallel-from-file-key');
  assert.equal(Object.keys(loaded).sort().join(','), 'EXA_API_KEY,PARALLEL_API_KEY');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('process env wins over files, and placeholder values are ignored', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'talent-secrets-'));
  const file = path.join(dir, 'research.env');
  fs.writeFileSync(file, 'EXA_API_KEY=sk-...\nPARALLEL_API_KEY=changeme\n');
  const loaded = loadTalentResearchSecrets(
    {
      AI_FUND_TALENT_SECRETS: file,
      EXA_API_KEY: 'exa-from-process',
      PARALLEL_API_KEY: 'parallel-from-process'
    },
    path.join(dir, 'no-home')
  );
  assert.equal(loaded.EXA_API_KEY, 'exa-from-process');
  assert.equal(loaded.PARALLEL_API_KEY, 'parallel-from-process');
  const placeholders = loadTalentResearchSecrets(
    { AI_FUND_TALENT_SECRETS: file },
    path.join(dir, 'no-home')
  );
  assert.deepEqual(placeholders, {});
  fs.rmSync(dir, { recursive: true, force: true });
});

test('candidate files never include hive settings or roster paths', () => {
  const files = talentResearchSecretCandidateFiles('/tmp/home', '/tmp/explicit.env');
  assert.equal(files[0], '/tmp/explicit.env');
  const blob = files.join('\n');
  assert.doesNotMatch(blob, /hive\/agents/);
  assert.doesNotMatch(blob, /roster\.json/);
});
