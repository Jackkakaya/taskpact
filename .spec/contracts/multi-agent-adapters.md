---
spec: task
name: "多 agent 原生适配"
status: done
round: 1
max_rounds: 3
created: 2026-06-03
updated: 2026-06-03
---

## 意图

让 taskpact 用**每个主流编码 agent 的原生机制**安装 6 个阶段指令——能做用户可调用斜杠命令的就生成命令（Cursor/Gemini/Cline/Copilot/Roo/Kiro/Junie 等 14 个），用户触发但非斜杠的生成对应格式（Codex `$`、Kimi `/skill:`、Amazon Q `@`），没有命令机制的才退而注入方法论（Augment/Aider/Zed 等）。覆盖主流，而非只支持 Claude Code。

## 已定决策

- 适配按 format 分发：skill / command（5 种 frontmatter 风格）/ gemini-toml / qwen-md / rule / aider
- 各工具落点按其 2026 官方文档（Cursor `.cursor/commands/`、Gemini `.gemini/commands/*.toml`、Cline `.clinerules/workflows/` 调用带 `.md` 等）
- Gemini TOML 用 literal 三引号 `'''…'''`，避免 prompt 正文里的反斜杠/正则被转义
- 根级规则文件（如 Zed `.rules`）有 clobber 保护：已存在则跳过不覆盖
- 诚实分级：只有 Claude Code 端到端验证，其余标注格式来源

## 边界

### 允许修改
- cli/src/core/agents.ts
- cli/src/core/adapters.ts
- cli/src/commands/init.ts
- cli/src/commands/update.ts
- cli/test/adapters.test.ts
- cli/test/agents.test.ts

### 禁止做
- 不要引入新的运行时依赖
- 不要覆盖用户已有的根级规则文件

## 完成条件

场景: 命令类工具生成原生命令文件 [必须]
  测试: command format
  假设 选择 Cursor / Roo / Copilot / Trae / Continue 等命令类工具
  当 生成安装文件
  那么 落点路径、扩展名、frontmatter 风格各自符合该工具官方格式

场景: Gemini 生成合法 TOML [必须]
  测试: gemini-toml format
  假设 选择 Gemini CLI
  当 生成安装文件
  那么 命名空间化为 taskpact.toml + taskpact/<phase>.toml
  并且 prompt 用 literal 三引号包裹，三引号成对出现

场景: 各工具调用前缀正确 [必须]
  测试: invocationFor
  假设 不同工具有不同调用语法
  那么 Claude=/taskpact-clarify、Cline=/taskpact-clarify.md、Gemini=/taskpact:clarify、Codex=$、Kimi=/skill:、Amazon Q=@

场景: 根级规则文件不被覆盖 [必须]
  测试: rule / aider formats
  假设 rule 类工具（如 Zed）写根级 .rules
  那么 install 文件带 clobberRisk 标记，已存在时跳过

## 验证记录

来源: 自验证
轮次: 1
时间: 2026-06-03 01:22

- 命令类工具生成原生命令文件: pass
- Gemini 生成合法 TOML: pass
- 各工具调用前缀正确: pass
- 根级规则文件不被覆盖: pass
功能验证: 已 `taskpact init --all` 生成全部 22 个工具的文件并逐一抽查格式；clobber 测试中预置 .rules 被保留、warn 提示、写 0 文件；Gemini TOML 三引号成对、description 可解析。

结论: 4 pass
