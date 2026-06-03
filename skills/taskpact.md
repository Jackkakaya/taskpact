# taskpact: 智能入口

一个命令搞定整条流水线。你读取当前状态，自动判断该做什么，然后转入对应子流程。

用户不需要记住 init / clarify / implement / verify 的顺序——这是你的工作，不是用户的。

## 输入

```
/taskpact                      # 看状态，自动决定下一步
/taskpact 我要做一个用户注册功能   # 带需求 → 通常进澄清
/taskpact 继续                  # 继续当前合约
/taskpact 状态                  # 只看进度，不动手
```

## 核心：先判断状态，再行动

**第一步永远是搞清楚现在在哪。** 不要凭对话记忆，一切以磁盘上的文件为准。

```
1. .spec/config.md 不存在？
   → 项目还没初始化。
   → 如果 .spec/ 目录也不存在：提示用户先运行 `npx taskpact init`（CLI 装技能文件），再回来。
   → 如果 .spec/ 存在但 config.md 缺失或全是占位注释：转入 taskpact-init 流程（扫描项目、填 config.md）。

2. config.md 存在且有真实内容？
   → 扫描 .spec/contracts/*.md，读每个合约的 frontmatter status。
   → 按下面的"状态 → 动作"表决定下一步。
```

## 状态 → 动作

扫描所有合约的 status，**唯一真相源是合约 frontmatter 的 status，不是 config.md，也不是对话历史。**

| 现状 | 你的动作 |
|------|---------|
| 用户带了**新需求**描述 | 转入 **taskpact-clarify**，把需求作为输入。即使已有其他合约，新需求优先建新合约。 |
| 没有任何合约 + 无需求 | 问用户想做什么，然后转入 **taskpact-clarify**。 |
| 有 `draft` 合约 | 澄清没走完。转入 **taskpact-clarify** 继续把它补全到 `agreed`。 |
| 有 `agreed` 合约 | 合约已锁定，等实现。转入 **taskpact-implement**。 |
| 有 `in_progress` 合约 | 实现中或有 fail 待修。转入 **taskpact-implement**（它会自己判断是首次实现还是修复模式）。 |
| 有 `needs-review` 合约 | **停下来交给人。** 读验证记录，把需人工确认的点（[必须] uncertain、超轮次、反复 fail）清楚列给用户，等指示。不要自作主张置 done。 |
| 只有 `done` 合约 | 实现已自验证通过。问用户：要不要跑一轮独立 **taskpact-verify** 交叉验证？或者开始下一个需求？ |
| 多个在途合约（agreed/in_progress） | 列出来让用户选，或按用户指定的合约名继续。 |

## 怎么"转入"子流程

确定动作后：

1. **先用一句话告诉用户你的判断和决定**，例如：
   > 当前有 1 个 `agreed` 合约 `user-register`，还没实现。我来执行实现流程。
2. 然后**调用对应的子技能**（taskpact-clarify / taskpact-implement / taskpact-verify / taskpact-init / taskpact-status），完整遵循它的指令。
3. 子流程跑完后，回到这里复盘：状态变了吗？要不要自动衔接下一步（比如 implement 完成 → 提示可以 verify）？

**衔接原则：** 能自动往下走的就往下走，但**两个地方必须停下来问人**——
- 进入 clarify 的追问环节（需要用户回答澄清问题）。
- 合约进入 `needs-review`（需要人工判断）。
其余环节（agreed→implement→自验证）你应当自主完成，这正是"用户去喝茶"的含义。

## 只看状态（用户问"状态/进度/到哪了"）

转入 **taskpact-status** 流程：渲染所有合约的进度表，不修改任何文件。

## 注意事项

- **永远先读盘再动手。** config.md + 合约文件 + git log 是你的外部记忆，对话历史不是。
- **不要重复用户已经做过的决定。** 如果合约已 agreed，别再问需求；直接实现。
- **状态判断错了，整条流水线就错了。** 拿不准当前该做什么时，宁可用一句话跟用户确认，也不要猜。
- 这个入口是为了**省去用户记命令**，不是为了替用户做产品决策。澄清阶段的业务选择仍然要问用户。
