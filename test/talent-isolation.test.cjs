const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const hive = fs.readFileSync(path.join(root, 'src/main/hive.ts'), 'utf8');
const config = fs.readFileSync(path.join(root, 'src/main/config.ts'), 'utf8');
const main = fs.readFileSync(path.join(root, 'src/main/index.ts'), 'utf8');

test('Codex workers never copy the user config or inherit its connectors', () => {
  assert.doesNotMatch(hive, /readFileSync\(join\(userHome, 'config\.toml'\)/);
  assert.match(hive, /Generated locally; do not add connectors or secrets/);
  assert.match(hive, /--sandbox', 'workspace-write'/);
  assert.match(hive, /--ask-for-approval', 'never'/);
  assert.match(hive, /installCodexHooks\(dir, meta\.id\)/);
  assert.match(hive, /talentSiderScholarCodexToml/);
});

test('Claude workers exclude user settings and MCP configuration', () => {
  assert.match(hive, /--setting-sources', 'local'/);
  assert.match(hive, /--strict-mcp-config/);
  assert.match(hive, /args\.push\('--mcp-config', settingsPath\)/);
  assert.match(hive, /isTalentResearchAgent\(meta\.id\)/);
  assert.match(hive, /buildTalentResearchMcpServers/);
  assert.match(hive, /allow: \[/);
  assert.match(hive, /'WebSearch'/);
  assert.match(hive, /'WebFetch'/);
  assert.match(hive, /deny: \[/);
  assert.match(hive, /'Bash'/);
  assert.match(hive, /'NotebookEdit'/);
  assert.match(hive, /talentSiderScholarClaudeDenyPermissions/);
  assert.doesNotMatch(hive, /aifund-lever|lever-eir|LEVER_API_KEY/);
  assert.doesNotMatch(hive, /server-gsuite|GOOGLE_OAUTH_TOKEN/);
});

test('Talent mode disables bypasses, integrations, triggers, and telemetry', () => {
  assert.match(config, /function withTalentIsolation/);
  for (const expected of [
    'autoMode: false',
    'orchestratorMaySpawn: false',
    'integrations: []',
    'telemetryEnabled: false',
    'slackEnabled: false',
    'webhookEnabled: false',
    'webhookTriggers: []'
  ]) assert.ok(config.includes(expected), `missing Talent isolation setting: ${expected}`);
  assert.match(main, /AI_FUND_TALENT_MODE !== '1'/);
});
