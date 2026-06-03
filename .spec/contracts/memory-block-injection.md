---
spec: task
name: "项目原则注入根级 memory 文件"
status: done
round: 0
max_rounds: 3
created: 2026-06-03
updated: 2026-06-03
---

## 意图

taskpact 现在只在技能流程被触发时才读 config.md，项目原则容易随对话变长被遗忘。借各编码 agent 对根级 memory 文件（AGENTS.md / CLAUDE.md / GEMINI.md 等）的"每会话原生读取"，在 `init`/`update` 时注入一个 taskpact-managed 指针 block，让"动手前必读 config.md 项目原则"这条指令稳定进上下文，且不依赖斜杠命令被触发。

## 已定决策

- block 为**纯指针**：只指向 `.spec/config.md` 的「## 项目原则」，不内联原则正文（避免与 config.md 两份内容漂移）。
- block 用 HTML 注释标记包裹：`<!-- taskpact:start v<版本> -->` … `<!-- taskpact:end -->`。
- upsert 语义（幂等、保留用户内容）：
  - 文件不存在 → 创建，仅含 block。
  - 文件存在、无标记 → 末尾追加 block，用户原内容逐字保留。
  - 文件存在、有标记 → 仅替换 start/end 之间内容（刷新版本），其余不动；重复 upsert 结果稳定。
- 注入落点 = **通用 `AGENTS.md`（总是写）** + 选中 agent 各自的 memory 文件（去重）。memory 文件作为 `AgentDef` 上的可选字段 `memoryFile?`：
  - Claude Code → `CLAUDE.md`
  - Gemini CLI → `GEMINI.md`
  - GitHub Copilot → `.github/copilot-instructions.md`
  - 其余 agent 不单独配，靠 `AGENTS.md` 覆盖（AGENTS.md 已是 Cursor/Codex/Windsurf 等的事实标准）。
- 核心逻辑放在新文件 `cli/src/core/memory.ts`，做成纯函数（block 渲染 / upsert / 落点收集），便于单测；不引入 I/O 到纯函数里（写盘由 init/update 调用方做）。
- init 与 update 都调用注入；update 即幂等刷新。

## 边界

### 允许修改
- cli/src/core/memory.ts
- cli/src/core/agents.ts
- cli/src/commands/init.ts
- cli/src/commands/update.ts
- cli/test/memory.test.ts

### 禁止做
- 不引入新的运行时依赖
- 不破坏/覆盖用户在 taskpact 标记之外的任何 AGENTS.md / CLAUDE.md 内容
- 不修改 .spec/config.md 与 .spec/contracts/

## 完成条件

场景: block 渲染为纯指针 [必须]
  测试: memory pointer
  假设 用某版本号渲染 managed block
  当 取 block 文本
  那么 含 `<!-- taskpact:start` 与 `<!-- taskpact:end -->` 标记
  并且 正文指向 .spec/config.md 的项目原则
  并且 不内联 config.md 的具体原则条目（纯指针，防漂移）

场景: 文件缺失时创建 [必须]
  测试: memory upsert creates
  假设 目标文件原内容为空（文件不存在）
  当 对内容做 upsert
  那么 返回内容仅含一个 taskpact block，带 start/end 标记

场景: 保留用户内容并追加 [必须]
  测试: memory upsert appends
  假设 已有用户内容且不含 taskpact 标记
  当 对该内容做 upsert
  那么 用户原内容逐字保留
  并且 block 追加在末尾

场景: 幂等替换旧 block [必须]
  测试: memory upsert idempotent
  假设 内容已含一个旧版本 taskpact block 和一些用户内容
  当 upsert 新版本 block
  那么 仅 start/end 之间被替换，标记不重复
  并且 用户内容不变
  并且 对同一输入连续 upsert 两次结果完全相同

场景: 落点 = AGENTS.md + 选中 agent 的 memoryFile，去重 [必须]
  测试: memory targets
  假设 选中 Claude Code 与 Gemini CLI
  当 计算注入目标文件列表
  那么 包含 AGENTS.md、CLAUDE.md、GEMINI.md
  并且 列表去重，无 memoryFile 的 agent 不产生额外文件

场景: init/update 接线注入 [应该]
  验证方式: 代码审查
  假设 用户跑 taskpact init 或 update
  那么 对每个目标文件读出现有内容、upsert 后写回
  并且 update 多次运行不产生重复 block

## 验证记录

来源: 自验证
时间: 2026-06-03 23:17

- block 渲染为纯指针: pass
- 文件缺失时创建: pass
- 保留用户内容并追加: pass
- 幂等替换旧 block: pass
- 落点 = AGENTS.md + 选中 agent 的 memoryFile，去重: pass
- init/update 接线注入: pass（init 端到端验证；update 为同一 upsert 逻辑，代码审查确认）

功能验证（以用户身份实际运行）:
临时目录预置含用户内容的 AGENTS.md，跑 `taskpact init --agent claude --agent gemini --agent github-copilot --yes`：
- AGENTS.md 的 "House rules" 完整保留，taskpact block 追加末尾
- CLAUDE.md / GEMINI.md / .github/copilot-instructions.md（含子目录创建）均生成并写入 block
- 再次运行 init：AGENTS.md 中 taskpact:start 计数 = 1（幂等不重复），用户内容仍在

原则核对（config.md「## 项目原则」逐条）:
- 版本号单一来源、禁止硬编码: 满足 — block 用运行时 VERSION，无硬编码版本号
- 技能元数据单一来源: 不适用 — 本次不涉及技能元数据
- CLI 对用户内容只读/仅追加、绝不无条件覆盖: 满足 — memory 注入用幂等 upsert，仅替换 taskpact 标记内区域，端到端验证用户内容保留；未触碰 config.md / contracts
- 对外诚实、未验证标 experimental: 满足 — 仅 claude/gemini/copilot 配落点，文件生成均端到端验证，落点依据各家官方记忆文件约定（已在合约决策注明）。诚实补充：未在真实 Gemini/Copilot 运行时验证"读取并生效"，与现有 adapters 合约同等诚实标准
- 纯函数必须有 vitest 单测: 满足 — memory.ts 三个纯函数均有单测（memory.test.ts，5 测试）

结论: 5 [必须] pass + 1 [应该] pass；原则核对 4 满足 / 1 不适用，无违反、无 uncertain。
构建: 通过。全量测试: 56 passed。

流程偏离（待用户授权）: implement 的"一场景一提交"被推迟 —— 本仓库尚无任何 commit，且全局规则要求 commit 需用户授权。代码与验证已完成，commit 策略待用户确认。
