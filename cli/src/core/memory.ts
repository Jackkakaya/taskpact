// Injects a taskpact-managed reminder block into root memory files (AGENTS.md
// and each agent's native memory file). These files are read by coding agents
// every session, so the "read config.md principles before coding" instruction
// stays in front of the model — not only when a taskpact skill is triggered.
//
// All functions here are pure (no fs): rendering, upsert, and target collection.
// The actual read/write is done by the init/update commands.

import type { AgentDef } from './agents.js';

const START_PREFIX = '<!-- taskpact:start';
const END_MARKER = '<!-- taskpact:end -->';

/** The universal root memory file that essentially every agent convention reads. */
export const UNIVERSAL_MEMORY_FILE = 'AGENTS.md';

/**
 * Render the taskpact managed block — a PURE POINTER to config.md. It never
 * inlines the actual principles, so config.md stays the single source of truth
 * and the two can't drift.
 */
export function renderMemoryBlock(version: string): string {
  return `${START_PREFIX} v${version} -->
本项目由 taskpact 管理。
动手写任何代码前，必读 \`.spec/config.md\` 的「## 项目原则」并严格遵守。
任务状态以 \`.spec/contracts/*.md\` 的 frontmatter \`status\` 为唯一真相源。
${END_MARKER}`;
}

/**
 * Insert or refresh the taskpact block in `existing` content. Idempotent:
 * upsertMemoryBlock(upsertMemoryBlock(x, b), b) === upsertMemoryBlock(x, b).
 *
 * - empty input        → just the block
 * - no existing marker → append the block, keeping user content verbatim
 * - existing marker    → replace only the [start..end] region, leave the rest
 */
export function upsertMemoryBlock(existing: string, block: string): string {
  const startIdx = existing.indexOf(START_PREFIX);

  if (startIdx === -1) {
    if (existing.trim() === '') return block + '\n';
    const base = existing.endsWith('\n') ? existing : existing + '\n';
    return base + '\n' + block + '\n';
  }

  const endIdx = existing.indexOf(END_MARKER, startIdx);
  if (endIdx === -1) {
    // Malformed (start without end): treat from start to EOF as ours.
    return existing.slice(0, startIdx) + block + '\n';
  }
  const after = existing.slice(endIdx + END_MARKER.length);
  return existing.slice(0, startIdx) + block + after;
}

/**
 * Files to inject the block into for a given set of selected agents:
 * the universal AGENTS.md plus each agent's own memoryFile, deduped.
 * Agents without a memoryFile rely on AGENTS.md.
 */
export function memoryTargets(agents: AgentDef[]): string[] {
  const out: string[] = [UNIVERSAL_MEMORY_FILE];
  for (const a of agents) {
    if (a.memoryFile && !out.includes(a.memoryFile)) out.push(a.memoryFile);
  }
  return out;
}
