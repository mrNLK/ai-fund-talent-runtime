import { useEffect, useRef } from 'react';
import { TALENT_TEAM } from '@shared/talentTeam';
import { useStore, type Agent } from '@/store/store';
import { buildSpawnCommand, tokenizeCommand, type HarnessConfig } from '@/store/config';

// Beat the upstream previous-session auto-restore (2.5s). Fixed roles must be
// recreated from today's locked-down definitions, never a stale saved command.
const BOOT_DELAY_MS = 500;

function basename(path: string): string {
  return path.split('/').filter(Boolean).pop() ?? path;
}

/** Keep the fixed first Talent team present. The upstream restore queue is
 * user-dismissable and can lag the main-process orphan migration; a fixed role
 * must therefore respawn whenever it has no live PTY or active floor card. */
export function useTalentTeam(config: HarnessConfig | null, godReady: boolean): void {
  const provisioning = useRef(false);

  useEffect(() => {
    if (!config?.onboardingComplete || !config.harnessHome || !godReady || provisioning.current) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled || provisioning.current) return;
      provisioning.current = true;
      try {
        const [registry, livePtys] = await Promise.all([
          window.cth.hiveRegistry(),
          window.cth.listPtys()
        ]);
        const liveIds = new Set(livePtys.map((p) => p.id));
        const workspace = config.registeredRepos[0] || config.harnessHome!;

        for (const definition of TALENT_TEAM) {
          if (cancelled) return;
          const ptyId = `pty-${definition.id}`;
          if (liveIds.has(ptyId) || useStore.getState().agents.some((a) => a.id === definition.id)) continue;

          // Re-enter a surviving isolated worktree instead of attempting to
          // create it again. Non-isolated roles always start in the registered
          // Talent project.
          const existing = registry.agents?.[definition.id];
          let spawnWorkspace = workspace;
          let isolate = definition.isolate;
          if (definition.isolate && existing?.cwd && existing.cwd !== workspace
            && await window.cth.gitIsRepo(existing.cwd)) {
            spawnWorkspace = existing.cwd;
            isolate = false;
          }

          const command = buildSpawnCommand(config, undefined, definition.provider);
          const [exe, ...args] = tokenizeCommand(command);
          const result = await window.cth.spawnPty({
            id: ptyId,
            cwd: spawnWorkspace,
            command: exe,
            provider: definition.provider,
            args,
            cols: 100,
            rows: 30,
            isolate,
            hive: {
              id: definition.id,
              name: definition.name,
              provider: definition.provider,
              cwd: spawnWorkspace,
              role: definition.role,
              capabilities: [...definition.capabilities]
            }
          });

          if (!result.ok) {
            console.error(`[talent-team] ${definition.name} failed to start:`, result.error);
            continue;
          }

          useStore.getState().removeRestorableAgent(definition.id);

          const cwd = result.cwd || spawnWorkspace;
          const agent: Agent = {
            id: definition.id,
            name: definition.name,
            character: definition.character as Agent['character'],
            accent: definition.accent,
            description: definition.role,
            project: basename(definition.isolate ? workspace : cwd),
            tmuxTarget: '',
            cwd,
            goal: definition.goal,
            status: 'idle',
            action: 'starting up',
            progress: 0,
            currentStation: 'desk',
            ptyId,
            command,
            provider: definition.provider,
            worktreePath: result.worktreePath,
            seedPrompt: result.seedPrompt,
            recentTextTs: Date.now()
          };
          useStore.getState().addAgent(agent);
        }
      } catch (error) {
        console.error('[talent-team] provisioning failed:', error);
      } finally {
        provisioning.current = false;
      }
    }, BOOT_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [config?.onboardingComplete, config?.harnessHome, godReady]);
}
