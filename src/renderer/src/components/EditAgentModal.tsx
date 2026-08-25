import { useEffect, useMemo, useState } from 'react';
import { PixelPanel } from './PixelPanel';
import { PixelButton } from './PixelButton';
import { SpritePortrait } from './SpritePortrait';
import { ProviderLogo } from './ProviderLogo';
import { Icon } from './Icon';
import { useStore, type Agent } from '@/store/store';
import { OFFICE_CAST, type OfficeCharacterName } from '@/scene/office/cast';
import { type AccentColorName } from '@/design/tokens';
import {
  type AgentProvider,
  type HarnessConfig,
  AGENT_PROVIDER_PRESETS,
  buildSpawnCommand,
  modelsForProvider,
  inferAgentProvider,
  providerPreset,
  isClaudeProvider
} from '@/store/config';
import './EditAgentModal.css';

const ACCENTS: AccentColorName[] = ['coral', 'mint', 'sky', 'lemon', 'lilac', 'peach'];

export interface EditAgentModalProps {
  agent: Agent;
  onClose: () => void;
}

/**
 * Focused post-hire editor for Identity / Briefing / Engine. Save patches the
 * durable roster via updateAgent; engine changes apply on the next restart.
 */
export function EditAgentModal({ agent, onClose }: EditAgentModalProps) {
  const updateAgent = useStore((s) => s.updateAgent);
  const [config, setConfig] = useState<HarnessConfig | null>(null);

  const initialProvider = inferAgentProvider(agent.command, agent.provider);
  const [name, setName] = useState(agent.name);
  const [character, setCharacter] = useState<OfficeCharacterName>(agent.character);
  const [accent, setAccent] = useState<AccentColorName>(agent.accent);
  const [provider, setProvider] = useState<AgentProvider>(initialProvider);
  const [model, setModel] = useState<string | undefined>(agent.model);
  const [description, setDescription] = useState(agent.description);
  const [goal, setGoal] = useState(agent.goal ?? '');

  useEffect(() => {
    void window.cth.getConfig().then(setConfig).catch(() => setConfig(null));
  }, []);

  // Keep form in sync when the selected agent changes while the modal is open.
  useEffect(() => {
    setName(agent.name);
    setCharacter(agent.character);
    setAccent(agent.accent);
    setProvider(inferAgentProvider(agent.command, agent.provider));
    setModel(agent.model);
    setDescription(agent.description);
    setGoal(agent.goal ?? '');
  }, [agent.id]);

  // The editor owns Escape while open. Capturing prevents the fullscreen view
  // underneath from reacting to the same keypress.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  const pickProvider = (id: AgentProvider) => {
    setProvider(id);
    if (!config) {
      setModel(undefined);
      return;
    }
    const nextModel = isClaudeProvider(id) ? config.defaultModel : config.providerDefaultModels?.[id];
    setModel(nextModel);
  };

  const preset = providerPreset(provider);
  const availableModels = useMemo(() => {
    const known = modelsForProvider(provider);
    return model && !known.some((item) => item.id === model)
      ? [...known, { id: model, label: `${model} (current)` }]
      : known;
  }, [model, provider]);

  const isDirty = name !== agent.name
    || character !== agent.character
    || accent !== agent.accent
    || provider !== initialProvider
    || model !== agent.model
    || description !== agent.description
    || goal !== (agent.goal ?? '');

  const save = () => {
    const trimmedName = name.trim() || agent.name;
    const trimmedDescription = description.trim() || 'a fresh harness';
    const trimmedGoal = goal.trim();
    const command = config
      ? buildSpawnCommand(config, model, provider)
      : agent.command;

    updateAgent(agent.id, {
      name: trimmedName,
      character,
      accent,
      provider,
      model,
      command,
      description: trimmedDescription,
      goal: trimmedGoal || undefined
    });
    onClose();
  };

  const identityLabelId = `edit-agent-${agent.id}-identity`;
  const colorLabelId = `edit-agent-${agent.id}-color`;
  const providerLabelId = `edit-agent-${agent.id}-provider`;
  const modelLabelId = `edit-agent-${agent.id}-model`;

  return (
    <div className="cth-edit-agent__backdrop" onClick={onClose}>
      <div
        className="cth-edit-agent"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cth-edit-agent-title"
        onClick={(event) => event.stopPropagation()}
      >
        <PixelPanel variant="dialog" noPadding>
          <header className="cth-edit-agent__header">
            <div className="cth-edit-agent__heading">
              <h2 id="cth-edit-agent-title">EDIT AGENT</h2>
              <span>{agent.name}</span>
            </div>
            <button
              type="button"
              className="cth-edit-agent__close"
              onClick={onClose}
              aria-label="Close agent editor"
              title="Close"
            >
              <Icon name="x" />
            </button>
          </header>

          <div className="cth-edit-agent__scroll">
            <div className="cth-edit-agent__top-grid">
              <Section label="Identity" hint="name · character · color">
                <Field label="Name" htmlFor="edit-agent-name">
                  <input
                    id="edit-agent-name"
                    className="cth-edit-agent__input cth-input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Stanley"
                    autoFocus
                  />
                </Field>

                <div className="cth-edit-agent__field" role="group" aria-labelledby={identityLabelId}>
                  <span id={identityLabelId} className="cth-edit-agent__field-label">Character</span>
                  <div className="cth-edit-agent__character-grid">
                    {OFFICE_CAST.map((castMember) => {
                      const active = character === castMember.name;
                      return (
                        <button
                          key={castMember.name}
                          type="button"
                          className="cth-edit-agent__character"
                          data-selected={active ? 'true' : undefined}
                          aria-pressed={active}
                          onClick={() => {
                            setCharacter(castMember.name);
                            setName(castMember.displayName);
                          }}
                          title={castMember.blurb}
                          style={{ '--agent-accent-light': `var(--cth-${accent}-light)` } as React.CSSProperties}
                        >
                          <span className="cth-edit-agent__portrait">
                            <SpritePortrait character={castMember.name} scale={1.5} />
                          </span>
                          <span>{castMember.displayName}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="cth-edit-agent__field" role="group" aria-labelledby={colorLabelId}>
                  <span id={colorLabelId} className="cth-edit-agent__field-label">Color</span>
                  <div className="cth-edit-agent__colors">
                    {ACCENTS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className="cth-edit-agent__color"
                        data-selected={accent === color ? 'true' : undefined}
                        aria-label={color}
                        aria-pressed={accent === color}
                        onClick={() => setAccent(color)}
                        title={color}
                        style={{ background: `var(--cth-${color})` }}
                      />
                    ))}
                  </div>
                </div>
              </Section>

              <Section label="Briefing" hint="description · standing goal">
                <Field label="Description" htmlFor="edit-agent-description">
                  <textarea
                    id="edit-agent-description"
                    className="cth-edit-agent__input cth-edit-agent__description cth-input"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="what is this agent for"
                    rows={2}
                  />
                </Field>

                <Field label="Goal (optional)" htmlFor="edit-agent-goal" grow>
                  <textarea
                    id="edit-agent-goal"
                    className="cth-edit-agent__input cth-edit-agent__goal cth-input"
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    placeholder="long-running directive injected on every prompt"
                  />
                </Field>
              </Section>
            </div>

            <Section label="Engine" hint="provider · model · next restart" wide>
              <div className="cth-edit-agent__field" role="group" aria-labelledby={providerLabelId}>
                <span id={providerLabelId} className="cth-edit-agent__field-label">Provider</span>
                <div className="cth-edit-agent__provider-grid">
                  {AGENT_PROVIDER_PRESETS.map((item) => {
                    const active = provider === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="cth-edit-agent__choice"
                        data-selected={active ? 'true' : undefined}
                        aria-pressed={active}
                        onClick={() => pickProvider(item.id)}
                        title={item.label}
                        style={{ '--agent-accent-light': `var(--cth-${accent}-light)` } as React.CSSProperties}
                      >
                        <ProviderLogo provider={item.id} size={14} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {preset.supportsModel ? (
                <div className="cth-edit-agent__field" role="group" aria-labelledby={modelLabelId}>
                  <span id={modelLabelId} className="cth-edit-agent__field-label">Model</span>
                  <div className="cth-edit-agent__model-grid">
                    {availableModels.map((item) => {
                      const active = (model ?? '') === (item.id ?? '');
                      return (
                        <button
                          key={item.label}
                          type="button"
                          className="cth-edit-agent__choice"
                          data-selected={active ? 'true' : undefined}
                          aria-pressed={active}
                          onClick={() => setModel(item.id)}
                          title={item.id ?? 'CLI default model'}
                          style={{ '--agent-accent-light': `var(--cth-${accent}-light)` } as React.CSSProperties}
                        >
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <p className="cth-edit-agent__engine-note">
                Engine changes are saved for the next restart. Use Command Center → Floor to restart a live session with the new provider or model.
              </p>
            </Section>
          </div>

          <footer className="cth-edit-agent__footer">
            <PixelButton variant="ghost" size="md" onClick={onClose}>cancel</PixelButton>
            <span className="cth-edit-agent__change-state">
              {isDirty ? 'unsaved changes' : 'no changes yet'}
            </span>
            <PixelButton variant="primary" size="md" onClick={save} disabled={!isDirty}>
              <Icon name="check" />
              save changes
            </PixelButton>
          </footer>
        </PixelPanel>
      </div>
    </div>
  );
}

function Section({
  label,
  hint,
  children,
  wide = false
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={`cth-edit-agent__section${wide ? ' cth-edit-agent__section--wide' : ''}`}>
      <div className="cth-edit-agent__section-header">
        <h3>{label}</h3>
        <span>{hint}</span>
      </div>
      <div className="cth-edit-agent__section-body">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  children,
  grow = false
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  grow?: boolean;
}) {
  return (
    <label className={`cth-edit-agent__field${grow ? ' cth-edit-agent__field--grow' : ''}`} htmlFor={htmlFor}>
      <span className="cth-edit-agent__field-label">{label}</span>
      {children}
    </label>
  );
}
