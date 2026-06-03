import { describe, it, expect } from 'vitest';
import { AGENTS, getAgent, invocationFor } from '../dist/core/agents.js';

describe('agent registry', () => {
  it('has unique ids', () => {
    const ids = new Set(AGENTS.map((a) => a.id));
    expect(ids.size).toBe(AGENTS.length);
  });

  it('every agent has a valid support tier and format', () => {
    for (const a of AGENTS) {
      expect(['slash', 'mention', 'rule']).toContain(a.support);
      expect(['skill', 'command', 'gemini-toml', 'qwen-md', 'rule', 'aider']).toContain(a.format);
    }
  });

  it('covers the mainstream tools', () => {
    const ids = AGENTS.map((a) => a.id);
    for (const must of ['claude', 'cursor', 'github-copilot', 'windsurf', 'cline', 'roo', 'gemini', 'codex', 'continue', 'opencode', 'kiro']) {
      expect(ids).toContain(must);
    }
  });

  it('most tools now offer real per-phase invocation (not just methodology)', () => {
    const invocable = AGENTS.filter((a) => a.support !== 'rule');
    expect(invocable.length).toBeGreaterThanOrEqual(15);
  });

  it('getAgent resolves and returns undefined for unknown', () => {
    expect(getAgent('claude')?.name).toBe('Claude Code');
    expect(getAgent('nope')).toBeUndefined();
  });
});

describe('invocationFor', () => {
  const cases: [string, string, string][] = [
    ['claude', 'taskpact-clarify', '/taskpact-clarify'],
    ['cline', 'taskpact-clarify', '/taskpact-clarify.md'],
    ['gemini', 'taskpact-clarify', '/taskpact:clarify'],
    ['gemini', 'taskpact', '/taskpact'],
    ['qwen', 'taskpact-implement', '/taskpact:implement'],
    ['codex', 'taskpact-clarify', '$taskpact-clarify'],
    ['kimi', 'taskpact-clarify', '/skill:taskpact-clarify'],
    ['amazon-q', 'taskpact-clarify', '@taskpact-clarify'],
  ];
  for (const [id, skill, expected] of cases) {
    it(`${id} → ${expected}`, () => {
      expect(invocationFor(getAgent(id)!, skill)).toBe(expected);
    });
  }
});
