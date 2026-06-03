---
spec: task
name: "guard 边界机械校验命令"
status: done
round: 1
max_rounds: 3
created: 2026-06-03
updated: 2026-06-03
---

## 意图

提供 `taskpact guard` 子命令，把合约「边界 / 允许修改」从靠 LLM 自觉的软约束，变成可被代码机械校验的硬约束：解析活跃合约的允许修改 glob，对 git 改动做白名单检查，越界则非零退出，可挂 pre-commit 或 CI。

## 已定决策

- glob → RegExp 自实现（`**` 跨目录、`*` 不跨 `/`、`?` 单字符），不引入额外依赖
- `.spec/**` 始终隐式允许（taskpact 自身状态文件）
- 改动来源 = `git diff --name-only HEAD` ∪ `git ls-files --others --exclude-standard`
- 多个活跃合约且未指定 `--contract` → 报错并列出候选

## 边界

### 允许修改
- cli/src/commands/guard.ts
- cli/src/core/contract.ts
- cli/test/guard.test.ts
- cli/src/index.ts

### 禁止做
- 不要修改 .spec/config.md
- 不要引入新的运行时依赖

## 完成条件

场景: glob 边界匹配正确 [必须]
  测试: globToRegExp
  假设 边界声明 "src/api/**" 与 "src/*.ts"
  当 用改动文件路径去匹配
  那么 "src/api/auth/login.ts" 命中 "src/api/**"
  并且 "src/payment/charge.ts" 不命中（** 之外）
  并且 "src/core/x.ts" 不命中 "src/*.ts"（* 不跨 /）

场景: 允许修改边界解析 [必须]
  测试: allowed globs
  假设 合约的「### 允许修改」列了若干 glob
  当 解析合约
  那么 只取「允许修改」子段的条目，不混入「禁止做」

## 验证记录

来源: 自验证
轮次: 1
时间: 2026-06-03 00:46

- glob 边界匹配正确: pass
- 允许修改边界解析: pass
功能验证: 已在临时 git 仓库运行 `taskpact guard`，越界文件 src/payment/charge.ts 被拦截并 exit 1，边界内文件放行。

结论: 2 pass
