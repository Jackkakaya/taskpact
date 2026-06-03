// How taskpact's 6 phase instructions are delivered to each coding agent.
// Verified against each tool's official docs (2026). The goal is to use each
// tool's NATIVE best mechanism — real user-invocable commands where possible,
// methodology injection only where the tool has nothing better.

export type Support =
  | 'slash' // user-invocable slash command (/taskpact-clarify) — first class
  | 'mention' // user-triggered, but via @ / $ / /skill: instead of /
  | 'rule'; // always-on / on-demand methodology injection, no per-phase command

export type Format =
  | 'skill' // <dir>/<id>/SKILL.md  (Claude Code, Kiro, Codex, Kimi)
  | 'command' // <dir>/<id><ext>  with a per-tool frontmatter style
  | 'gemini-toml' // <dir>/taskpact[/<phase>].toml
  | 'qwen-md' // <dir>/taskpact[/<phase>].md (namespaced)
  | 'rule' // single consolidated methodology file
  | 'aider'; // CONVENTIONS-style file + .aider.conf.yml hint

export type FmStyle = 'none' | 'desc' | 'desc-arg' | 'copilot' | 'continue' | 'trae';

export interface AgentDef {
  id: string;
  name: string;
  support: Support;
  format: Format;
  /** Base directory (or root marker for rule/aider) where files are written. */
  dir: string;
  /** command format only: file extension, default '.md'. */
  ext?: string;
  /** command format only: which frontmatter to emit. */
  fm?: FmStyle;
  /** Invocation sigil for display, e.g. '/', '@', '$', '/skill:'. */
  sigil?: string;
  /** Invocation suffix appended after the id, e.g. '.md' for Cline. */
  suffix?: string;
  /** gemini-toml / qwen-md use /taskpact:<phase> namespacing. */
  namespaced?: boolean;
  /** Paths that mean "this tool is used here". Defaults to [dir]. */
  detectionPaths?: string[];
  /** rule/aider: writing this would overwrite a user-owned root file — skip if it exists. */
  clobberRisk?: boolean;
  /** One-line note shown after install for non-slash tools. */
  note?: string;
  /** Project-level memory file this tool reads each session, beyond the universal AGENTS.md. */
  memoryFile?: string;
}

export const AGENTS: AgentDef[] = [
  // ── First-class: real user-invocable slash commands ──────────────────────
  { id: 'claude', name: 'Claude Code', support: 'slash', format: 'skill', dir: '.claude/skills', sigil: '/', detectionPaths: ['.claude'], memoryFile: 'CLAUDE.md' },
  { id: 'cursor', name: 'Cursor', support: 'slash', format: 'command', dir: '.cursor/commands', fm: 'none', sigil: '/', detectionPaths: ['.cursor'] },
  { id: 'windsurf', name: 'Windsurf', support: 'slash', format: 'command', dir: '.windsurf/workflows', fm: 'desc', sigil: '/', detectionPaths: ['.windsurf'] },
  { id: 'trae', name: 'Trae', support: 'slash', format: 'command', dir: '.trae/commands', fm: 'trae', sigil: '/', detectionPaths: ['.trae'] },
  { id: 'github-copilot', name: 'GitHub Copilot', support: 'slash', format: 'command', dir: '.github/prompts', ext: '.prompt.md', fm: 'copilot', sigil: '/', detectionPaths: ['.github/copilot-instructions.md', '.github/prompts', '.github'], memoryFile: '.github/copilot-instructions.md' },
  { id: 'cline', name: 'Cline', support: 'slash', format: 'command', dir: '.clinerules/workflows', fm: 'none', sigil: '/', suffix: '.md', detectionPaths: ['.clinerules'] },
  { id: 'roo', name: 'Roo Code', support: 'slash', format: 'command', dir: '.roo/commands', fm: 'desc-arg', sigil: '/', detectionPaths: ['.roo'] },
  { id: 'kilocode', name: 'Kilo Code', support: 'slash', format: 'command', dir: '.kilo/commands', fm: 'desc', sigil: '/', detectionPaths: ['.kilo', '.kilocode'] },
  { id: 'opencode', name: 'OpenCode', support: 'slash', format: 'command', dir: '.opencode/commands', fm: 'desc', sigil: '/', detectionPaths: ['.opencode'] },
  { id: 'continue', name: 'Continue', support: 'slash', format: 'command', dir: '.continue/prompts', fm: 'continue', sigil: '/', detectionPaths: ['.continue'] },
  { id: 'gemini', name: 'Gemini CLI', support: 'slash', format: 'gemini-toml', dir: '.gemini/commands', namespaced: true, detectionPaths: ['.gemini'], memoryFile: 'GEMINI.md' },
  { id: 'qwen', name: 'Qwen Code', support: 'slash', format: 'qwen-md', dir: '.qwen/commands', namespaced: true, detectionPaths: ['.qwen'] },
  { id: 'kiro', name: 'Kiro', support: 'slash', format: 'skill', dir: '.kiro/skills', sigil: '/', detectionPaths: ['.kiro'] },
  { id: 'junie', name: 'JetBrains Junie', support: 'slash', format: 'command', dir: '.junie/commands', fm: 'desc', sigil: '/', detectionPaths: ['.junie'] },

  // ── User-triggered, non-slash sigil ──────────────────────────────────────
  { id: 'codex', name: 'Codex', support: 'mention', format: 'skill', dir: '.agents/skills', sigil: '$', detectionPaths: ['.codex', '.agents', 'AGENTS.md'], note: 'Codex skills are invoked with $taskpact-clarify' },
  { id: 'kimi', name: 'Kimi CLI', support: 'mention', format: 'skill', dir: '.kimi/skills', sigil: '/skill:', detectionPaths: ['.kimi'], note: 'Kimi skills are invoked with /skill:taskpact-clarify' },
  { id: 'amazon-q', name: 'Amazon Q Developer', support: 'mention', format: 'command', dir: '.amazonq/prompts', fm: 'none', sigil: '@', detectionPaths: ['.amazonq'], note: 'Amazon Q prompts are invoked with @taskpact-clarify' },

  // ── Rule / methodology injection only (no per-phase command) ─────────────
  { id: 'augment', name: 'Augment', support: 'rule', format: 'rule', dir: '.augment/rules', detectionPaths: ['.augment'], note: 'Injected as Augment rules; trigger phases by natural language' },
  { id: 'lingma', name: 'Lingma', support: 'rule', format: 'rule', dir: '.lingma/rules', detectionPaths: ['.lingma'], note: 'Injected as a project rule (experimental)' },
  { id: 'codebuddy', name: 'CodeBuddy', support: 'rule', format: 'rule', dir: '.codebuddy/rules', detectionPaths: ['.codebuddy'], note: 'Injected as a project rule (experimental)' },
  { id: 'aider', name: 'Aider', support: 'rule', format: 'aider', dir: '.', detectionPaths: ['.aider.conf.yml', '.aider.conf.yaml'], note: 'Writes TASKPACT.md — add `read: TASKPACT.md` to .aider.conf.yml' },
  { id: 'zed', name: 'Zed', support: 'rule', format: 'rule', dir: '.rules', clobberRisk: true, detectionPaths: ['.zed', '.rules'], note: 'Methodology written to project .rules (skipped if one already exists)' },
];

export function getAgent(id: string): AgentDef | undefined {
  return AGENTS.find((a) => a.id === id);
}

/** How a user invokes a given phase in this tool — for install summaries/docs. */
export function invocationFor(agent: AgentDef, skillId: string): string {
  if (agent.support === 'rule') return agent.note ?? 'natural language';
  if (agent.namespaced) {
    const phase = skillId === 'taskpact' ? '' : skillId.replace(/^taskpact-/, '');
    return phase ? `/taskpact:${phase}` : '/taskpact';
  }
  return `${agent.sigil ?? '/'}${skillId}${agent.suffix ?? ''}`;
}
