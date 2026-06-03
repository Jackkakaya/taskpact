import { describe, it, expect } from 'vitest';
import { getInstallFiles } from '../dist/core/adapters.js';
import { getAgent } from '../dist/core/agents.js';

const skills = [
  { id: 'taskpact', description: '智能入口', argHint: '[需求]', content: 'ENTRY_BODY' },
  { id: 'taskpact-clarify', description: '把模糊需求转化为精准的合约', argHint: '<需求描述>', content: 'CLARIFY_BODY' },
];

const filesFor = (id: string) => getInstallFiles(getAgent(id)!, skills);

describe('skill format (Claude Code)', () => {
  const f = filesFor('claude');
  it('one SKILL.md per skill', () => {
    expect(f).toHaveLength(2);
    expect(f[1].path).toBe('.claude/skills/taskpact-clarify/SKILL.md');
  });
  it('frontmatter + body', () => {
    expect(f[1].content).toContain('name: taskpact-clarify');
    expect(f[1].content).toContain('user-invocable: true');
    expect(f[1].content).toContain('CLARIFY_BODY');
  });
});

describe('command format', () => {
  it('Cursor: plain markdown, no frontmatter', () => {
    const f = filesFor('cursor');
    expect(f[1].path).toBe('.cursor/commands/taskpact-clarify.md');
    expect(f[1].content.startsWith('# taskpact')).toBe(false); // body is CLARIFY_BODY here
    expect(f[1].content).toBe('CLARIFY_BODY\n');
  });
  it('Roo: description + argument-hint frontmatter', () => {
    const f = filesFor('roo');
    expect(f[1].path).toBe('.roo/commands/taskpact-clarify.md');
    expect(f[1].content).toContain('description: "把模糊需求转化为精准的合约"');
    expect(f[1].content).toContain('argument-hint: "<需求描述>"');
  });
  it('Copilot: .prompt.md with agent field', () => {
    const f = filesFor('github-copilot');
    expect(f[1].path).toBe('.github/prompts/taskpact-clarify.prompt.md');
    expect(f[1].content).toContain('agent: agent');
  });
  it('Continue: invokable:true', () => {
    const f = filesFor('continue');
    expect(f[1].content).toContain('invokable: true');
  });
  it('Trae: Name/Description then separator', () => {
    const f = filesFor('trae');
    expect(f[1].content.startsWith('Name: taskpact-clarify\nDescription: ')).toBe(true);
  });
  it('Windsurf workflows dir', () => {
    expect(filesFor('windsurf')[1].path).toBe('.windsurf/workflows/taskpact-clarify.md');
  });
  it('OpenCode plural commands dir', () => {
    expect(filesFor('opencode')[1].path).toBe('.opencode/commands/taskpact-clarify.md');
  });
});

describe('gemini-toml format', () => {
  const f = filesFor('gemini');
  it('namespaces entry vs phases', () => {
    expect(f[0].path).toBe('.gemini/commands/taskpact.toml');
    expect(f[1].path).toBe('.gemini/commands/taskpact/clarify.toml');
  });
  it('valid TOML: description + literal-string prompt with even triple-quotes', () => {
    const c = f[1].content;
    expect(c).toContain('description = "把模糊需求转化为精准的合约"');
    expect((c.match(/'''/g) || []).length).toBe(2);
    expect(c).toContain('CLARIFY_BODY');
  });
});

describe('qwen-md format', () => {
  it('namespaced markdown with description', () => {
    const f = filesFor('qwen');
    expect(f[1].path).toBe('.qwen/commands/taskpact/clarify.md');
    expect(f[1].content).toContain('description: "把模糊需求转化为精准的合约"');
  });
});

describe('rule / aider formats', () => {
  it('Augment: single namespaced rule file', () => {
    const f = filesFor('augment');
    expect(f).toHaveLength(1);
    expect(f[0].path).toBe('.augment/rules/taskpact.md');
    expect(f[0].content).toContain('taskpact 方法论');
  });
  it('Zed: writes .rules and flags clobberRisk', () => {
    const f = filesFor('zed');
    expect(f[0].path).toBe('.rules');
    expect(f[0].clobberRisk).toBe(true);
  });
  it('Aider: writes TASKPACT.md', () => {
    const f = filesFor('aider');
    expect(f[0].path).toBe('TASKPACT.md');
  });
});
