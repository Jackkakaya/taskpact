---
spec: task
name: "status 状态总览命令"
status: done
round: 1
max_rounds: 3
created: 2026-06-03
updated: 2026-06-03
---

## 意图

提供 `taskpact status` 子命令，从合约文件确定性地算出每个合约的真实阶段并渲染进度表，回答「喝完茶回来进展到哪了」。同时检测 frontmatter 的 status 与验证记录之间的漂移，落实「合约 status 是唯一真相源」。

## 已定决策

- 真实阶段由 `deriveStatus` 从验证记录推导，不信任可能过时的 frontmatter
- done 判定：所有 [必须] pass 且无 [必须] fail/uncertain；[必须] uncertain → needs-review；超 max_rounds 仍 fail → needs-review
- 命令只读，绝不写任何文件

## 边界

### 允许修改
- cli/src/commands/status.ts
- cli/src/core/contract.ts
- cli/test/contract.test.ts

### 禁止做
- status 命令不得修改任何文件

## 完成条件

场景: 漂移检测 [必须]
  测试: deriveStatus
  假设 合约 frontmatter 写 done，但验证记录里有一个 [必须] 场景 fail
  当 推导真实阶段
  那么 推导结果为 in_progress（与 frontmatter 不一致 → 报漂移）

场景: done 判定收紧 [必须]
  测试: deriveStatus
  假设 一个 [必须] 场景结果为 uncertain
  那么 推导阶段为 needs-review，不是 done

场景: 场景与验证记录解析 [必须]
  测试: scenarios
  假设 合约完成条件里有带优先级与测试绑定的场景
  当 解析合约
  那么 正确取出每个场景的名称、优先级、测试函数名

## 验证记录

来源: 自验证
轮次: 1
时间: 2026-06-03 00:46

- 漂移检测: pass
- done 判定收紧: pass
- 场景与验证记录解析: pass
功能验证: 已对一份"frontmatter done 但含 [必须] fail"的合约运行 `taskpact status`，输出进度表并打印漂移告警 + 正确的下一步（修复）。

结论: 3 pass
