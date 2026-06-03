import { describe, it, expect } from 'vitest';
import {
  renderMemoryBlock,
  upsertMemoryBlock,
  memoryTargets,
  UNIVERSAL_MEMORY_FILE,
} from '../dist/core/memory.js';
import { getAgent } from '../dist/core/agents.js';

describe('memory pointer', () => {
  const block = renderMemoryBlock('0.1.0');
  it('memory pointer: markers present, points at config.md, no inlined principles', () => {
    expect(block).toContain('<!-- taskpact:start');
    expect(block).toContain('<!-- taskpact:end -->');
    expect(block).toContain('.spec/config.md');
    expect(block).toContain('项目原则');
    // pure pointer — must NOT inline concrete principle lines
    expect(block).not.toContain('禁止');
    expect(block).not.toContain('覆盖率');
  });
});

describe('memory upsert', () => {
  const block = renderMemoryBlock('0.1.0');

  it('memory upsert creates: empty input yields a single block', () => {
    const out = upsertMemoryBlock('', block);
    expect(out).toContain('<!-- taskpact:start');
    expect(out).toContain('<!-- taskpact:end -->');
    expect((out.match(/taskpact:start/g) || []).length).toBe(1);
  });

  it('memory upsert appends: preserves user content, block goes to the end', () => {
    const user = '# My rules\nuse tabs not spaces\n';
    const out = upsertMemoryBlock(user, block);
    expect(out.startsWith('# My rules\nuse tabs not spaces\n')).toBe(true);
    expect(out).toContain('<!-- taskpact:start');
    expect(out.indexOf('My rules')).toBeLessThan(out.indexOf('taskpact:start'));
  });

  it('memory upsert idempotent: replaces old block, keeps user content, stable', () => {
    const user = '# My rules\nfoo\n';
    const seeded = upsertMemoryBlock(user, renderMemoryBlock('0.0.1'));
    const once = upsertMemoryBlock(seeded, block);
    expect(once).toContain('v0.1.0');
    expect(once).not.toContain('v0.0.1');
    expect((once.match(/taskpact:start/g) || []).length).toBe(1);
    expect(once).toContain('# My rules\nfoo');
    const twice = upsertMemoryBlock(once, block);
    expect(twice).toBe(once);
  });
});

describe('memory targets', () => {
  it('memory targets: AGENTS.md + selected agents memoryFile, deduped', () => {
    const claude = getAgent('claude')!;
    const gemini = getAgent('gemini')!;
    const cursor = getAgent('cursor')!; // no memoryFile → contributes nothing extra
    const targets = memoryTargets([claude, gemini, cursor]);
    expect(targets).toContain('AGENTS.md');
    expect(targets).toContain('CLAUDE.md');
    expect(targets).toContain('GEMINI.md');
    expect(new Set(targets).size).toBe(targets.length); // deduped
    expect(UNIVERSAL_MEMORY_FILE).toBe('AGENTS.md');
  });
});
