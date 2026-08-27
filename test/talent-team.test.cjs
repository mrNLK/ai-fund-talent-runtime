const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');

function loadTs(relativePath) {
  const sourcePath = path.join(__dirname, '..', relativePath);
  const out = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'talent-runtime-'));
  const outputPath = path.join(dir, 'module.cjs');
  fs.writeFileSync(outputPath, out, 'utf8');
  return require(outputPath);
}

test('the fixed team uses all three required agent engines', () => {
  const { TALENT_TEAM } = loadTs('src/shared/talentTeam.ts');
  assert.deepEqual(TALENT_TEAM.map((a) => [a.id, a.provider]), [
    ['talent-researcher', 'claude'],
    ['candidate-analyst', 'codex'],
    ['automation-engineer', 'cursor']
  ]);
  assert.equal(new Set(TALENT_TEAM.map((a) => a.id)).size, TALENT_TEAM.length);
});

test('every worker goal carries the candidate-write boundary', () => {
  const { TALENT_TEAM, TALENT_CHIEF_GOAL } = loadTs('src/shared/talentTeam.ts');
  for (const agent of TALENT_TEAM) {
    assert.match(agent.goal, /AI_FUND_TALENT_CONTEXT\.md/);
    assert.match(agent.goal, /do not contact|never send candidate/i);
  }
  assert.match(TALENT_CHIEF_GOAL, /explicit approval/);
});

test('permission manifest denies candidate writes by default and for workers', () => {
  const permissions = JSON.parse(fs.readFileSync(
    path.join(__dirname, '..', 'config', 'talent-permissions.json'), 'utf8'
  ));
  assert.equal(permissions.default.candidateCommunications, 'deny');
  assert.equal(permissions.default.candidateRecordWrites, 'deny');
  for (const id of ['talent-researcher', 'candidate-analyst', 'automation-engineer']) {
    assert.equal(permissions.roles[id].candidateCommunications, 'deny');
    assert.equal(permissions.roles[id].candidateRecordWrites, 'deny');
  }
});

test('the original Talent office map is structurally complete', () => {
  const { talentOfficeMapRaw } = loadTs('src/renderer/src/scene/office/talentOfficeMap.ts');
  const map = JSON.parse(talentOfficeMapRaw);
  for (const layer of map.layers.filter((l) => l.type === 'tilelayer')) {
    assert.equal(layer.data.length, map.width * map.height, layer.name);
  }
  assert.ok(map.layers.find((l) => l.name === 'spawn-points').objects.length >= 4);
});
