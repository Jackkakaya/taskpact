import path from 'path';
import type { AgentDef, FmStyle } from './agents.js';
import { VERSION } from '../version.js';

export interface SkillInput {
  id: string;
  description: string;
  argHint: string;
  content: string;
}

export interface InstallFile {
  path: string;
  content: string;
  /** Writing this would overwrite a user-owned root file — caller should skip if it exists. */
  clobberRisk?: boolean;
}

/** Every file taskpact should write for one agent, in that agent's native format. */
export function getInstallFiles(agent: AgentDef, skills: SkillInput[]): InstallFile[] {
  switch (agent.format) {
    case 'skill':
      return skills.map((s) => ({
        path: path.join(agent.dir, s.id, 'SKILL.md'),
        content: skillFile(s),
      }));

    case 'command':
      return skills.map((s) => ({
        path: path.join(agent.dir, `${s.id}${agent.ext ?? '.md'}`),
        content: commandFrontmatter(agent.fm ?? 'desc', s) + s.content + '\n',
      }));

    case 'gemini-toml':
      return skills.map((s) => ({
        path: nsPath(agent.dir, s.id, '.toml'),
        content: geminiToml(s),
      }));

    case 'qwen-md':
      return skills.map((s) => ({
        path: nsPath(agent.dir, s.id, '.md'),
        content: commandFrontmatter('desc', s) + s.content + '\n',
      }));

    case 'rule':
      return [
        {
          path: agent.clobberRisk ? agent.dir : path.join(agent.dir, 'taskpact.md'),
          content: methodologyRule(agent),
          clobberRisk: agent.clobberRisk,
        },
      ];

    case 'aider':
      return [{ path: 'TASKPACT.md', content: methodologyRule(agent) }];
  }
}

// ── renderers ──────────────────────────────────────────────────────────────

function skillFile(s: SkillInput): string {
  return `---
name: ${s.id}
description: "${s.description}"
argument-hint: "${s.argHint}"
user-invocable: true
metadata:
  author: taskpact
  version: "${VERSION}"
---

${s.content}
`;
}

function commandFrontmatter(fm: FmStyle, s: SkillInput): string {
  switch (fm) {
    case 'none':
      return '';
    case 'desc':
      return `---\ndescription: "${s.description}"\n---\n\n`;
    case 'desc-arg':
      return `---\ndescription: "${s.description}"\nargument-hint: "${s.argHint}"\n---\n\n`;
    case 'copilot':
      return `---\ndescription: "${s.description}"\nagent: agent\n---\n\n`;
    case 'continue':
      return `---\nname: ${s.id}\ndescription: "${s.description}"\ninvokable: true\n---\n\n`;
    case 'trae':
      // Trae: `Name` + `Description` lines, then a `---` separator, then the body.
      return `Name: ${s.id}\nDescription: ${s.description}\n---\n\n`;
  }
}

function geminiToml(s: SkillInput): string {
  // TOML literal multiline string ('''…''') so backslashes/quotes in the
  // Markdown body are taken verbatim (the prompts contain grep regexes etc.).
  return `description = "${s.description}"\nprompt = '''\n${s.content}\n'''\n`;
}

/** Map a skill id to a namespaced command path: taskpact → taskpact.x; taskpact-init → taskpact/init.x */
function nsPath(dir: string, id: string, ext: string): string {
  if (id === 'taskpact') return path.join(dir, `taskpact${ext}`);
  const phase = id.replace(/^taskpact-/, '');
  return path.join(dir, 'taskpact', `${phase}${ext}`);
}

function methodologyRule(agent: AgentDef): string {
  const frontmatter =
    agent.format === 'rule' && !agent.clobberRisk
      ? `---\ndescription: taskpact — 合约驱动的 AI 编码方法论（澄清/实现/验证时遵循）\n---\n\n`
      : '';

  return `${frontmatter}# taskpact 方法论（${agent.name}）

> ${agent.name} 没有 taskpact 的用户可调用斜杠命令，所以以"常驻方法论"形式注入。
> 用自然语言触发各阶段，例如：「用 taskpact 流程帮我把这个需求澄清成合约」「按合约实现」「验证合约」。

## 核心理念

精准的**合约** + **机械化验证**。合约文件（不是对话历史）是 source of truth。
合约写在 \`.spec/contracts/<name>.md\`；项目级配置写在 \`.spec/config.md\`。

## 四个阶段

1. **澄清** — 把模糊需求逐条追问成精准合约。一次只问一个问题，每问附推荐答案，查代码优先。
2. **实现** — 按合约的完成条件逐场景实现，一个场景一个提交，每个场景必须有通过的测试。
3. **自验证** — 实现完跑全量测试 + 以用户身份实际运行产出物。
4. **交叉验证** — 用干净视角逐条复核，诚实判 pass/fail/skip/uncertain。

## 合约格式

\`\`\`markdown
---
spec: task
name: "简短名称"
status: draft        # draft → agreed → in_progress → done（异常走 needs-review）
round: 0
max_rounds: 3
---

## 意图           # 做什么、为什么（2-3 句）
## 已定决策        # 已确定的技术选择
## 边界           # 允许修改 / 禁止做 的路径与约束
## 完成条件        # BDD 场景，每个绑定测试函数或标"验证方式: 代码审查"
\`\`\`

完成条件示例：
\`\`\`
场景: 注册成功 [必须]
  测试: test_register_returns_201
  假设 不存在邮箱为 "alice@example.com" 的用户
  当 客户端 POST /api/v1/users/register
  那么 响应状态码为 201
  并且 响应体包含字段 "user_id"
\`\`\`

## 验证四态

pass / fail / skip（[应该][可选] 未实现）/ uncertain（无法确定）。
done 的条件：所有 [必须] 场景 pass，且无 [必须] fail/uncertain。
[必须] 场景 uncertain 或超过 max_rounds → needs-review，交人工，不要置 done。

## 状态唯一真相

合约 frontmatter 的 \`status\` 是唯一真相源，config.md 不重复记状态。
`;
}
