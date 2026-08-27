const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluate } = require('../resources/talent-policy.cjs');

test('research and analysis stay inside their read-only role boundaries', () => {
  assert.equal(evaluate('talent-researcher', 'public-research').allowed, true);
  assert.equal(evaluate('candidate-analyst', 'deduplicate').allowed, true);
});

test('candidate-facing writes are blocked for every worker', () => {
  for (const role of ['talent-researcher', 'candidate-analyst', 'automation-engineer']) {
    assert.equal(evaluate(role, 'candidate-email-send').allowed, false);
    assert.equal(evaluate(role, 'ats-stage-change').allowed, false);
  }
});

test('Talent Chief cannot bypass the candidate-write boundary', () => {
  assert.equal(evaluate('talent-chief', 'candidate-record-update').allowed, false);
  assert.equal(evaluate('talent-chief', 'draft-communication').allowed, true);
});

test('unknown roles and unknown actions fail closed', () => {
  assert.equal(evaluate('unknown', 'public-research').allowed, false);
  assert.equal(evaluate('talent-researcher', 'repository-write').allowed, false);
});
