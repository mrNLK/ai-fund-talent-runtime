/**
 * Load Exa and Parallel keys for Talent Researcher without writing them to hive
 * files. Values are never logged. Lever, mail, and other secrets in the same
 * dotenv files are ignored.
 */
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface TalentResearchSecrets {
  EXA_API_KEY?: string;
  PARALLEL_API_KEY?: string;
}

const NAMES = ['EXA_API_KEY', 'PARALLEL_API_KEY'] as const;

function parseDotenvValue(raw: string): string {
  let v = raw.trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v.trim();
}

function isUsable(value: string): boolean {
  if (!value) return false;
  if (value.endsWith('...')) return false;
  if (/^(changeme|your-api-key|replace-me)$/i.test(value)) return false;
  return value.length >= 8;
}

function readNamedKeys(filePath: string): TalentResearchSecrets {
  const out: TalentResearchSecrets = {};
  if (!existsSync(filePath)) return out;
  let text = '';
  try { text = readFileSync(filePath, 'utf8'); }
  catch { return out; }
  for (const name of NAMES) {
    const match = text.match(new RegExp(`^(?:export\\s+)?${name}=(.*)$`, 'm'));
    if (!match) continue;
    const value = parseDotenvValue(match[1] ?? '');
    if (isUsable(value)) out[name] = value;
  }
  return out;
}

export function talentResearchSecretCandidateFiles(
  home = homedir(),
  extraPath?: string
): string[] {
  const files: string[] = [];
  if (extraPath) files.push(extraPath);
  files.push(
    join(home, '.config', 'ai-fund-talent', 'research.env'),
    join(home, 'Documents', '99_Inbox', 'env'),
    join(home, 've-pipeline-config-cleanup', '.env')
  );
  return files;
}

/** Merge process.env first, then the first files that fill remaining names. */
export function loadTalentResearchSecrets(
  env: NodeJS.ProcessEnv = process.env,
  home = homedir()
): TalentResearchSecrets {
  const out: TalentResearchSecrets = {};
  for (const name of NAMES) {
    const fromEnv = env[name];
    if (fromEnv && isUsable(fromEnv)) out[name] = fromEnv;
  }
  if (out.EXA_API_KEY && out.PARALLEL_API_KEY) return out;

  for (const file of talentResearchSecretCandidateFiles(home, env.AI_FUND_TALENT_SECRETS)) {
    const fromFile = readNamedKeys(file);
    if (!out.EXA_API_KEY && fromFile.EXA_API_KEY) out.EXA_API_KEY = fromFile.EXA_API_KEY;
    if (!out.PARALLEL_API_KEY && fromFile.PARALLEL_API_KEY) out.PARALLEL_API_KEY = fromFile.PARALLEL_API_KEY;
    if (out.EXA_API_KEY && out.PARALLEL_API_KEY) break;
  }
  return out;
}

export function talentResearchSecretStatus(secrets: TalentResearchSecrets): {
  hasExa: boolean;
  hasParallel: boolean;
} {
  return {
    hasExa: Boolean(secrets.EXA_API_KEY),
    hasParallel: Boolean(secrets.PARALLEL_API_KEY)
  };
}
