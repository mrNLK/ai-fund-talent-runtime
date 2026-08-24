import { spawnSync } from 'node:child_process';

const checks = [
  ['Git', 'git', ['--version']],
  ['Claude Code', 'claude', ['--version']],
  ['Codex', 'codex', ['--version']],
  ['Cursor Agent', 'cursor', ['agent', '--version']]
];

let failed = false;
for (const [label, command, args] of checks) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status === 0) {
    const version = (result.stdout || result.stderr).trim().split('\n')[0];
    process.stdout.write(`✓ ${label}${version ? `: ${version}` : ''}\n`);
  } else {
    failed = true;
    process.stdout.write(`✗ ${label}: unavailable\n`);
  }
}

const major = Number(process.versions.node.split('.')[0]);
if (major >= 20 && major < 23) process.stdout.write(`✓ Node: ${process.version}\n`);
else {
  failed = true;
  process.stdout.write(`✗ Node: ${process.version} (use Node 20, 21, or 22)\n`);
}

process.exitCode = failed ? 1 : 0;
