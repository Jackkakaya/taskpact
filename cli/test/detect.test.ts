import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { detectAgents } from '../dist/core/detect.js';

function fixture(...dirs: string[]): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-detect-'));
  for (const d of dirs) fs.mkdirSync(path.join(root, d), { recursive: true });
  return root;
}

describe('detectAgents', () => {
  it('detects an agent by its directory', () => {
    const root = fixture('.claude');
    const ids = detectAgents(root).map((a) => a.id);
    expect(ids).toContain('claude');
    expect(ids).not.toContain('cursor');
  });

  it('detects GitHub Copilot via custom detection paths', () => {
    const root = fixture('.github/prompts');
    expect(detectAgents(root).map((a) => a.id)).toContain('github-copilot');
  });

  it('returns nothing for a bare project', () => {
    const root = fixture('src');
    expect(detectAgents(root)).toHaveLength(0);
  });
});
