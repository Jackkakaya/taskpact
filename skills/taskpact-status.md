# taskpact: 状态总览

回答"喝完茶回来，进展到哪了？"。**只读不写**——不修改任何文件。

## 输入

```
/taskpact-status
/taskpact-status user-register   # 只看某个合约
```

## 数据来源

唯一真相源是磁盘上的合约文件，不是对话历史。

```
1. 读 .spec/config.md → 项目上下文、操作命令（可选，用于展示）
2. 扫描 .spec/contracts/*.md → 每个合约的 frontmatter（status/round/max_rounds）
   + ## 完成条件里的场景列表和优先级
   + ## 验证记录里每个场景最近一轮的 pass/fail/skip/uncertain
```

> 如果项目装了 CLI，`npx taskpact status` 会用代码确定性地解析出同样的表格，不依赖 AI 判断。本技能是它的对话版。

## 输出：进度表

为每个合约渲染一张表，按 status 分组（在途的排前面）：

```
合约: user-register        status: in_progress   轮次: 1/3
  完成条件:
    ✓ 注册成功            [必须] pass
    ✗ 重复邮箱被拒绝       [必须] fail — 期望 409，实际 500（register.ts:45）
    ? 注册页面布局        [应该] uncertain — 无法确认渲染
    – OAuth 登录          [可选] skip
  小结: 1 pass · 1 fail · 1 uncertain · 1 skip
  下一步: 有 [必须] fail → /taskpact-implement 进入修复模式
```

图例：✓ pass · ✗ fail · ? uncertain · – skip · ○ 未验证

## 每个 status 对应的"下一步"建议

| status | 含义 | 建议下一步 |
|--------|------|-----------|
| `draft` | 澄清未完成 | `/taskpact-clarify` 补全到 agreed |
| `agreed` | 已锁定待实现 | `/taskpact-implement`（或直接 `/taskpact`） |
| `in_progress` | 实现中 / 有 fail 待修 | `/taskpact-implement`（首次或修复模式） |
| `needs-review` | 需人工介入 | 看验证记录里"需人工确认"的项，人来拍板 |
| `done` | [必须] 全 pass | 可选 `/taskpact-verify` 做独立交叉验证 |

## 注意事项

- **绝不修改文件。** 这是只读命令。
- 如果某合约缺 `## 验证记录`，场景标"○ 未验证"，不要瞎猜结果。
- 如果 status 与验证记录看起来矛盾（比如 status: done 但记录里有 [必须] fail），**如实指出这个不一致**，提示用户跑一轮 verify 校正——这正是状态可信度的价值。
