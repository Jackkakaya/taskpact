# taskpact

> 合约驱动的 AI 编码 —— 让 agent 遵循合约，而不是凭感觉。

把模糊需求变成一份**精准的 Task Contract**，AI 按合约自主实现，再用干净的视角**机械化验证**每一条完成条件。合约文件（不是对话历史）是 source of truth，所以即使上下文被压缩、session 被 clear，进度也不会丢。

```
描述需求  →  澄清成合约  →  AI 按合约实现 + 自验证  →  独立交叉验证  →  交付
            └─ 你只在这里参与 ─┘         └────────── 你可以去喝茶 ──────────┘
```

## 解决什么问题

让 AI 写代码，最大的三个痛点：

1. **目标偏移** —— 你说做 A，它做成了 A1 甚至 B。
2. **频繁介入** —— 每隔几步就要人盯着纠偏。
3. **长 session 衰退** —— 上下文窗口饱和后输出质量下滑。

taskpact 的解法不是更长的流水线，而是**精准的合约 + 机械化的验证**：合约把"做什么 + 怎么算做完"钉死，验证逐条对照合约判定 pass/fail，AI 拿不准的诚实标 `uncertain` 而不是假装通过。

## 30 秒上手

> ⚠️ taskpact 的安装是**两步**，因为它们做的是两件不同的事。看清楚再跑。

**第 1 步 · 装技能文件（每个项目跑一次，CLI 完成）**

```bash
npx taskpact init
```

这会把 taskpact 的技能文件铺进你的 AI 工具（如 `.claude/skills/`），并创建 `.spec/` 目录骨架。**它不扫描你的代码。**

> 📦 **还没发布到 npm 时**，先从源码装一次全局命令：
> ```bash
> git clone https://github.com/Jackkakaya/taskpact.git
> cd taskpact/cli && npm install && npm link
> ```
> 之后在任意项目里 `taskpact init` 即可；npm 发布后直接 `npx taskpact init`。

**第 2 步 · 扫描项目、填配置（在你的 AI agent 里跑一次）**

在 Claude Code 里输入：

```
/taskpact-init
```

这一步才会真正读你的代码库，推断技术栈和构建/测试命令，和你确认项目原则，写好 `.spec/config.md`。

**然后就一个命令搞定全流程：**

```
/taskpact 我要做一个用户注册功能
```

`/taskpact` 是智能入口：它读取当前状态，自动决定该澄清、该实现、还是该验证——你不用记命令顺序。

## 工作流

| 阶段 | 命令 | 做什么 |
|------|------|--------|
| **入口** | `/taskpact [需求]` | 读状态，自动路由到下面某个阶段 |
| 澄清 | `/taskpact-clarify <需求>` | 一次一问（每问附推荐答案、查代码优先），把模糊需求逐条追问成精准合约 |
| 实现 | `/taskpact-implement` | 按完成条件逐场景实现，一个场景一个提交，每个场景必须有通过的测试 + 自验证 |
| 验证 | `/taskpact-verify` | 用干净视角逐条复核，诚实判 pass/fail/skip/uncertain，只改合约不改代码 |
| 状态 | `/taskpact-status` | 只读，渲染所有合约的进度表 |

只有"澄清追问"和"合约转入 needs-review"两处会停下来等你；其余环节 AI 自主完成。

## 合约长什么样

合约是一个 Markdown 文件，放在 `.spec/contracts/<name>.md`：

```markdown
---
spec: task
name: "用户注册 API"
status: agreed          # draft → agreed → in_progress → done（异常走 needs-review）
round: 0
max_rounds: 3
---

## 意图
实现用户注册 API，支持邮箱+密码注册。为后续登录、密码重置打基础。

## 已定决策
- 使用 POST /api/v1/users/register 作为唯一入口
- 密码用 bcrypt 哈希后存储

## 边界
### 允许修改
- src/api/auth/**
- tests/integration/register.test.ts
### 禁止做
- 不要修改现有 login 接口

## 完成条件

场景: 注册成功 [必须]
  测试: test_register_returns_201
  假设 不存在邮箱为 "alice@example.com" 的用户
  当 客户端 POST /api/v1/users/register，body 为 {email, password}
  那么 响应状态码为 201
  并且 响应体包含字段 "user_id"

场景: 重复邮箱被拒绝 [必须]
  测试: test_register_rejects_duplicate_email
  假设 已存在邮箱为 "alice@example.com" 的用户
  那么 响应状态码为 409
  并且 响应体包含错误码 "USER_ALREADY_EXISTS"
```

每个场景要么**绑定一个测试函数**（`测试:`，结果确定性），要么标 `验证方式: 代码审查`（AI 判断，可能 uncertain）。
完整格式见 [`contract-format.md`](./contract-format.md)。

## 四态验证 + 可信的 done

| 结果 | 含义 |
|------|------|
| `pass` | 测试通过 / 代码审查符合 |
| `fail` | 测试失败 / 明确不符合 |
| `skip` | `[应该]`/`[可选]` 场景未实现，不阻塞交付 |
| `uncertain` | AI 无法确定（如无法运行的 UI 渲染） |

**`done` 的条件很严：所有 `[必须]` 场景 pass，且没有 `[必须]` 场景是 fail 或 uncertain。**
一旦某个必须场景拿不准，合约转 `needs-review` 交人工拍板，**绝不靠把 uncertain 当 done 来骗绿灯**。

## CLI 命令

```bash
npx taskpact init [path]      # 装技能文件 + 建 .spec/ 骨架（不覆盖已有 config.md）
npx taskpact update [path]    # 升级技能文件到当前版本（不碰 config.md / 合约）
npx taskpact status [path]    # 用代码确定性地算出每个合约的真实阶段（只读）
npx taskpact guard [path]     # 校验 git 改动是否越出活跃合约的"允许修改"边界，越界则非零退出
```

`init` 支持非交互：`--yes`、`--agent claude cursor`、`--all`。
`guard` 可做 pre-commit hook 或 CI 门禁。`status` 还会标出 frontmatter 与验证记录的状态漂移。

## 支持的工具（覆盖主流编码 agent）

`npx taskpact init --all` 会用**每个工具的原生机制**安装——能做用户可调用斜杠命令的就装命令（最接近 Claude Code 体验），不能的才退而注入方法论。

**① 原生斜杠命令 `/taskpact-clarify`（14 个）**
Claude Code · Cursor · Windsurf · Trae · GitHub Copilot · Cline · Roo Code · Kilo Code · OpenCode · Continue · Gemini CLI · Qwen Code · Kiro · JetBrains Junie

**② 用户触发（非斜杠前缀）（3 个）**
Codex（`$taskpact-clarify`）· Kimi CLI（`/skill:taskpact-clarify`）· Amazon Q（`@taskpact-clarify`）

**③ 方法论注入（该工具无命令机制）（5 个）**
Augment · Aider · Zed · Lingma · CodeBuddy —— 用自然语言触发各阶段

确切落点按各家 **2026 官方文档**生成，例如：

| 工具 | 落点 | 调用 |
|------|------|------|
| Claude Code · Kiro | `.claude/skills/`、`.kiro/skills/<name>/SKILL.md` | `/taskpact-clarify` |
| Cursor · Trae · Junie | `.cursor/commands/`、`.trae/commands/`、`.junie/commands/*.md` | `/taskpact-clarify` |
| Windsurf · Roo · Kilo · OpenCode | `.windsurf/workflows/`、`.roo/commands/` … | `/taskpact-clarify` |
| GitHub Copilot | `.github/prompts/*.prompt.md` | `/taskpact-clarify` |
| Cline | `.clinerules/workflows/*.md` | `/taskpact-clarify.md` |
| Continue | `.continue/prompts/*.md`（`invokable: true`） | `/taskpact-clarify` |
| Gemini CLI | `.gemini/commands/taskpact/*.toml` | `/taskpact:clarify` |
| Qwen Code | `.qwen/commands/taskpact/*.md` | `/taskpact:clarify` |
| Codex · Kimi | `.agents/skills/`、`.kimi/skills/<name>/SKILL.md` | `$` / `/skill:` |
| Amazon Q | `.amazonq/prompts/*.md` | `@taskpact-clarify` |

> 诚实边界：每个工具的格式按其官方文档生成、并有单测覆盖；但只有 **Claude Code** 经过真实会话里的端到端验证。"格式正确"不等于"我逐一在每个工具里跑过"——欢迎反馈纠错。对没有命令机制的工具（Augment/Aider/Zed 等），taskpact 注入方法论文件，你用自然语言触发各阶段（如「用 taskpact 流程把需求澄清成合约」）。`init` 不会覆盖你已有的根级规则文件（如 Zed 的 `.rules`）。

## 致谢

taskpact 的合约结构（Intent / Decisions / Boundaries / Completion Criteria）、显式测试绑定与四态验证，直接借鉴自 [**ZhangHanDong/agent-spec**](https://github.com/ZhangHanDong/agent-spec) 的 Task Contract 设计——一个 AI-native 的 BDD/spec 验证工具。taskpact 在其之上补齐了**需求澄清**与**零工具链（纯 Markdown + Skill）**两环，并把状态做成代码可校验。需求质询与不确定性标记的思路参考 GitHub Spec Kit，流式阶段与 brownfield 思路参考 OpenSpec。

## License

[MIT](./LICENSE)
