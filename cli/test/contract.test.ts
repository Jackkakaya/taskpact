import { describe, it, expect } from 'vitest';
import {
  parseFrontmatter,
  parseScenarios,
  parseVerification,
  parseAllowedGlobs,
  parseContract,
  deriveStatus,
} from '../dist/core/contract.js';

const base = (status: string, round: number, record: string) => `---
spec: task
name: "用户注册"
status: ${status}
round: ${round}
max_rounds: 3
---
## 边界
### 允许修改
- src/api/**
- tests/x.test.ts
### 禁止做
- 不要动 login
## 完成条件
场景: 成功 [必须]
  测试: test_ok
  那么 201
场景: 重复 [必须]
  测试: test_dup
  那么 409
场景: 布局 [应该]
  验证方式: 代码审查
## 验证记录
${record}
`;

const DONE_WITH_FAIL = base('done', 1, `- 成功: pass
- 重复: fail — 期望409实际500
- 布局: uncertain — 无法确认`);

describe('frontmatter', () => {
  it('parses keys and strips quotes', () => {
    const fm = parseFrontmatter(DONE_WITH_FAIL);
    expect(fm.name).toBe('用户注册');
    expect(fm.status).toBe('done');
    expect(fm.round).toBe('1');
    expect(fm.max_rounds).toBe('3');
  });
});

describe('scenarios', () => {
  it('extracts name, priority and test binding', () => {
    const s = parseScenarios(DONE_WITH_FAIL);
    expect(s).toHaveLength(3);
    expect(s[0]).toMatchObject({ name: '成功', priority: 'required', test: 'test_ok' });
    expect(s[1]).toMatchObject({ name: '重复', priority: 'required', test: 'test_dup' });
    expect(s[2]).toMatchObject({ name: '布局', priority: 'should' });
  });
});

describe('verification record', () => {
  it('maps scenario name to result + note', () => {
    const v = parseVerification(DONE_WITH_FAIL);
    expect(v.get('成功')?.result).toBe('pass');
    expect(v.get('重复')?.result).toBe('fail');
    expect(v.get('重复')?.note).toContain('500');
    expect(v.get('布局')?.result).toBe('uncertain');
  });
});

describe('allowed globs', () => {
  it('reads only the 允许修改 subsection', () => {
    const g = parseAllowedGlobs(DONE_WITH_FAIL);
    expect(g).toEqual(['src/api/**', 'tests/x.test.ts']);
  });
});

describe('deriveStatus', () => {
  it('flags drift: a required fail means in_progress, not done', () => {
    const c = parseContract('x.md', DONE_WITH_FAIL);
    expect(c.status).toBe('done');
    expect(deriveStatus(c)).toBe('in_progress');
  });

  it('required uncertain → needs-review', () => {
    const content = base('done', 1, `- 成功: pass
- 重复: pass
- 布局: pass`).replace('场景: 布局 [应该]', '场景: 布局 [必须]')
      .replace('- 布局: pass', '- 布局: uncertain — 拿不准');
    const c = parseContract('x.md', content);
    expect(deriveStatus(c)).toBe('needs-review');
  });

  it('all required pass → done', () => {
    const content = base('in_progress', 1, `- 成功: pass
- 重复: pass
- 布局: skip`);
    const c = parseContract('x.md', content);
    expect(deriveStatus(c)).toBe('done');
  });

  it('required fail at max rounds → needs-review', () => {
    const content = base('in_progress', 3, `- 成功: pass
- 重复: fail — 还是不行
- 布局: skip`);
    const c = parseContract('x.md', content);
    expect(deriveStatus(c)).toBe('needs-review');
  });

  it('no verification record keeps agreed-ish status', () => {
    const content = base('agreed', 0, '');
    const c = parseContract('x.md', content);
    expect(deriveStatus(c)).toBe('agreed');
  });
});
