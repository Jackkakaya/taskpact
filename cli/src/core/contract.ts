import fs from 'fs';
import path from 'path';

export type Priority = 'required' | 'should' | 'optional';
export type Result = 'pass' | 'fail' | 'skip' | 'uncertain' | 'unverified';
export type Status = 'draft' | 'agreed' | 'in_progress' | 'done' | 'needs-review' | 'unknown';

export interface Scenario {
  name: string;
  priority: Priority;
  test?: string;
  result: Result;
  note?: string;
}

export interface Contract {
  file: string;            // absolute path
  name: string;            // frontmatter name (or filename)
  status: Status;
  round: number;
  maxRounds: number;
  scenarios: Scenario[];
  allowedGlobs: string[];  // from 边界 / 允许修改
}

const PRIORITY_MAP: Record<string, Priority> = { 必须: 'required', 应该: 'should', 可选: 'optional' };

export function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const out: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/);
    if (m) out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return out;
}

/** Extract the body of a `## <heading>` section up to the next `## ` heading. */
function sectionBody(content: string, heading: string): string {
  const re = new RegExp(`(^|\\n)##\\s+${heading}\\s*\\r?\\n([\\s\\S]*?)(\\n##\\s|$)`);
  const m = content.match(re);
  return m ? m[2] : '';
}

export function parseScenarios(content: string): Omit<Scenario, 'result' | 'note'>[] {
  const body = sectionBody(content, '完成条件');
  const scenarios: Omit<Scenario, 'result' | 'note'>[] = [];
  const lines = body.split(/\r?\n/);
  let current: Omit<Scenario, 'result' | 'note'> | null = null;
  for (const line of lines) {
    const head = line.match(/^场景:\s*(.+?)\s*(?:\[(必须|应该|可选)\])?\s*$/);
    if (head) {
      if (current) scenarios.push(current);
      current = { name: head[1].trim(), priority: head[2] ? PRIORITY_MAP[head[2]] : 'should' };
      continue;
    }
    if (current) {
      const test = line.match(/^\s*测试:\s*(.+?)\s*$/);
      if (test) current.test = test[1].trim();
    }
  }
  if (current) scenarios.push(current);
  return scenarios;
}

export function parseVerification(content: string): Map<string, { result: Result; note?: string }> {
  const body = sectionBody(content, '验证记录');
  const map = new Map<string, { result: Result; note?: string }>();
  for (const line of body.split(/\r?\n/)) {
    const m = line.match(/^-\s*(.+?):\s*(pass|fail|skip|uncertain)\b\s*(?:[—-]\s*(.*))?$/);
    if (m) map.set(m[1].trim(), { result: m[2] as Result, note: m[3]?.trim() || undefined });
  }
  return map;
}

export function parseAllowedGlobs(content: string): string[] {
  const body = sectionBody(content, '边界');
  // Take the "### 允许修改" subsection up to the next "### " heading.
  const m = body.match(/###\s+允许修改\s*\r?\n([\s\S]*?)(\n###\s|$)/);
  if (!m) return [];
  return m[1]
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*-\s*/, '').trim())
    .filter((l) => l.length > 0 && !l.startsWith('<!--'));
}

export function parseContract(file: string, content: string): Contract {
  const fm = parseFrontmatter(content);
  const scenarioDefs = parseScenarios(content);
  const verification = parseVerification(content);
  const scenarios: Scenario[] = scenarioDefs.map((s) => {
    const v = verification.get(s.name);
    return { ...s, result: v?.result ?? 'unverified', note: v?.note };
  });
  return {
    file,
    name: fm.name || path.basename(file, '.md'),
    status: (fm.status as Status) || 'unknown',
    round: Number(fm.round ?? 0) || 0,
    maxRounds: Number(fm.max_rounds ?? 3) || 3,
    scenarios,
    allowedGlobs: parseAllowedGlobs(content),
  };
}

export function loadContracts(contractsDir: string): Contract[] {
  if (!fs.existsSync(contractsDir)) return [];
  return fs
    .readdirSync(contractsDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const file = path.join(contractsDir, f);
      return parseContract(file, fs.readFileSync(file, 'utf-8'));
    });
}

/**
 * Compute the status a contract *should* have from its verification record,
 * independent of the frontmatter. Lets `status` surface drift between what the
 * AI wrote and what the scenarios actually say.
 */
export function deriveStatus(c: Contract): Status {
  if (c.scenarios.length === 0) return c.status;
  const required = c.scenarios.filter((s) => s.priority === 'required');
  const verified = c.scenarios.some((s) => s.result !== 'unverified');
  if (!verified) return c.status === 'unknown' ? 'agreed' : c.status;
  const reqFail = required.some((s) => s.result === 'fail');
  const reqUncertain = required.some((s) => s.result === 'uncertain');
  const reqUnverified = required.some((s) => s.result === 'unverified');
  if (reqFail) return c.round >= c.maxRounds ? 'needs-review' : 'in_progress';
  if (reqUncertain) return 'needs-review';
  if (reqUnverified) return 'in_progress';
  return 'done';
}

export function nextStep(status: Status): string {
  switch (status) {
    case 'draft': return '/taskpact-clarify  — 把合约补全到 agreed';
    case 'agreed': return '/taskpact-implement  — 开始实现（或 /taskpact 自动）';
    case 'in_progress': return '/taskpact-implement  — 继续实现 / 修复 fail';
    case 'needs-review': return '人工介入 — 看验证记录里"需人工确认"的项';
    case 'done': return '/taskpact-verify  — 可选，独立交叉验证';
    default: return '/taskpact-init  — 先初始化项目';
  }
}

export const ACTIVE_STATUSES: Status[] = ['agreed', 'in_progress', 'needs-review'];
