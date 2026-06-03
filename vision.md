# taskpact 产品愿景

## 终极目标

```
用户描述需求 → AI 自主实现 → 自动验证 → 交付高质量产品
用户在中间可以去喝茶、聊天、开 party
```

## 现实问题

1. **目标偏移**：描述做 A，结果做成 A1 甚至 B
2. **频繁介入**：AI 需要人不断干预
3. **长 session 衰退**：上下文窗口饱和后输出质量下降

## 核心理念

解决这些问题不靠复杂流程（Spec Kit 的 6 阶段、OpenSpec 的 4 制品都没解决），
靠的是**精准的合约 + 机械化的验证**。

三个关键环节：
1. **合约澄清** — 让用户和 AI 对"做什么"+"怎么算做完"达成一致
2. **自主实现** — AI 按合约执行，合约文件是跨 session 的持久锚点
3. **交叉验证** — 新的干净 session 逐条对照合约检验代码

合约文件（不是对话上下文）是 source of truth。

## 分阶段实施

### Phase 1：合约工具 + 单 session 闭环（当前）

帮用户把模糊需求变成精准的 Task Contract，并在单个 agent session 内完成实现与自验证。

核心交付物（已落地）：
- 合约格式规范（借鉴 agent-spec 的 Intent/Decisions/Boundaries/Completion Criteria + 四态验证）
- 六个技能：统一入口 `/taskpact`（读状态自动路由）+ init / clarify / implement / verify / status
- 澄清技能（一次一问 + 查代码优先 + 每问附推荐答案）
- CLI：`init`（装技能）/ `update`（升级技能）/ `status`（代码确定性算阶段）/ `guard`（边界白名单机械校验）
- 状态单一真相源：合约 `status` 唯一可信，config.md 不再双写

价值：即使不用自动化，一个好的合约也能大幅减少 AI 编码时的目标偏移。
用户把合约贴给任何 AI agent，效果都比裸提需求好。

### Phase 2：多 Agent 自动闭环（后续）

把 Phase 1 的手动「implement → verify → 修复」收敛成无人值守的自动闭环：
- 实现 session：load 合约 → 逐条实现 → 遇到上下文压力时合约文件保持状态
- 验证 session：**新的干净 sub-agent** → 逐条对照合约检验 → 写回 pass/fail
- 迭代闭环：fail → 修复 → 再验证 → 直到 done 或转 needs-review

> 现状诚实说明：`/taskpact` 入口已经能在一个 session 内自动路由各阶段，但「实现」与「验证」之间还是同一个 session、需要用户触发下一步；真正的「干净 session 交叉验证 + 自动迭代」是 Phase 2 才完成。

Phase 2 的关键设计决策（已确定）：
- 验证必须用新的干净 session（sub-agent），不在实现 session 里做
- 合约文件是 session 间唯一的通信介质
- 验证 agent 只改合约文件，不改代码
- 实现 agent 不改场景状态，状态由验证 agent 判定

## 与竞品的定位差异

| 维度 | Spec Kit | OpenSpec | agent-spec (张汉东) | taskpact |
|------|----------|---------|-------------------|------|
| 核心关注 | 过程管理 | 过程管理 | 验证门禁 | 目标达成 |
| 合约格式 | 自有模板 | 自有模板 | BDD Contract | 借鉴 agent-spec |
| 用户参与度 | 高 | 中 | 中 | 最低（统一入口自动路由） |
| 流程复杂度 | 6 阶段 | 4 制品 | 无流水线 | 无流水线 |
| 独立可用 | 需 CLI | 需 CLI | 需 Rust 工具链 | 纯 Markdown + Skill（CLI 可选） |
| 边界机械校验 | 无 | 无 | guard | guard（git diff 白名单） |
| 自动闭环 | 无 | 无 | 无 | Phase 2 |
