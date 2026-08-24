#!/usr/bin/env node
'use strict';

const HIGH_RISK = new Set([
  'candidate-email-send',
  'linkedin-outreach-send',
  'candidate-record-create',
  'candidate-record-update',
  'ats-stage-change',
  'crm-write',
  'production-data-write'
]);

const ROLE_ACTIONS = {
  'talent-chief': new Set(['orchestrate', 'public-research', 'analyze', 'draft-communication']),
  'talent-researcher': new Set(['public-research', 'analyze']),
  'candidate-analyst': new Set(['public-research', 'analyze', 'deduplicate', 'score']),
  'automation-engineer': new Set(['repository-read', 'repository-write', 'local-automation', 'test'])
};

function evaluate(role, action) {
  if (HIGH_RISK.has(action)) {
    return {
      allowed: false,
      decision: 'blocked',
      reason: 'Candidate-facing and production-data mutations are disabled in this prototype. Mike must explicitly authorize and a separate approved connector must enforce the exact action.'
    };
  }
  const allowed = ROLE_ACTIONS[role]?.has(action) === true;
  return allowed
    ? { allowed: true, decision: 'allow', reason: 'Action is inside this role\'s local read-only or development boundary.' }
    : { allowed: false, decision: 'blocked', reason: 'Action is outside this role\'s configured permission boundary.' };
}

if (require.main === module) {
  const [, , role, action] = process.argv;
  if (!role || !action) {
    process.stderr.write('usage: talent-policy <role> <action>\n');
    process.exit(2);
  }
  const result = evaluate(role, action);
  process.stdout.write(`${JSON.stringify({ role, action, ...result })}\n`);
  process.exit(result.allowed ? 0 : 3);
}

module.exports = { evaluate, HIGH_RISK, ROLE_ACTIONS };
