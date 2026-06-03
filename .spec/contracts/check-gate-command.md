---
spec: task
name: "check 项目原则门禁命令"
status: draft
round: 0
max_rounds: 3
created: 2026-06-03
updated: 2026-06-03
---

## 意图

提供 `taskpact check` 子命令，把 config.md 里"可机械校验的项目原则"从靠 LLM 自觉，变成可被代码强制的硬约束：读 config.md 的「## 门禁」段，挨个跑用户声明的命令，任一非零退出则 check 失败（exit 1），可挂 pre-commit / CI。与 `guard` 互补——guard 管"改了哪些文件"，check 管"代码是否过门禁"。这是"给软约束装牙齿"的第 1 层。

## 已定决策

- config.md 新增可选段「## 门禁」，**每行一条 shell 命令**（MVP 不支持描述前缀，保持解析简单；命令本身通常自解释）。例：
  ```
  ## 门禁
  - npx tsc --noEmit
  - npm run lint
  - npm test
  ```
- check 在项目根用 `execSync` 挨个跑门禁命令：任一非零 → 报告失败的命令 + 输出摘要 + `process.exitCode = 1`；全过 → exit 0。
- 没有「## 门禁」段 → 友好提示"未配置门禁"，exit 0（不算失败，避免逼用户必须配）。
- 解析做成纯函数 `parseGates(content)`（复用 contract.ts 的 `sectionBody` 思路）；执行汇总做成纯函数 `evaluateGates(gates, runner)`，`runner` 注入以便单测（命令层注入真实 execSync runner）。
- 不引入新运行时依赖（execSync 是 node 内置）。

## 边界

### 允许修改
- cli/src/commands/check.ts
- cli/src/core/config.ts
- cli/src/index.ts
- cli/test/check.test.ts

### 禁止做
- 不引入新的运行时依赖
- 不修改 .spec/config.md / .spec/contracts/
- 不与 guard 的边界逻辑耦合（两个命令各管各的）

## 完成条件

场景: 解析 config.md 门禁段 [必须]
  测试: parseGates
  假设 config.md 有「## 门禁」段，含若干行 `- 命令`（夹杂空行、`<!-- -->` 注释）
  当 调用 parseGates(content)
  那么 返回每条门禁命令的有序数组，去掉 `- ` 前缀
  并且 忽略空行和注释行
  并且 没有「## 门禁」段时返回空数组

场景: 任一门禁失败则整体失败 [必须]
  测试: evaluateGates fails
  假设 一组门禁命令，注入的 runner 让其中一条返回非零
  当 调用 evaluateGates(gates, runner)
  那么 结果判定为失败
  并且 失败列表包含那条命令及其输出摘要
  并且 通过的命令不在失败列表里

场景: 全部门禁通过则成功 [必须]
  测试: evaluateGates passes
  假设 一组门禁命令，注入的 runner 让每条都返回零
  当 调用 evaluateGates(gates, runner)
  那么 结果判定为成功，失败列表为空

场景: 未配置门禁不算失败 [必须]
  测试: evaluateGates empty
  假设 门禁列表为空
  当 调用 evaluateGates([], runner)
  那么 结果判定为成功（不算失败）
  并且 runner 一次都不被调用

场景: check 命令接线 [应该]
  验证方式: 代码审查
  假设 用户跑 taskpact check
  那么 命令读 config.md、parseGates 得到门禁、用真实 execSync runner 跑 evaluateGates
  并且 失败时 process.exitCode = 1、成功时正常退出
  并且 已在 index.ts 注册为子命令
