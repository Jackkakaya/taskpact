# Spec 工具调研报告

## 调研对象

**GitHub Spec Kit** (github/spec-kit) — GitHub 官方出品的 Spec-Driven Development 工具包，107K+ stars，Python 实现，MIT 协议。

## Spec Kit 核心工作流

```
constitution → specify → clarify → plan → tasks → implement
```

每一步生成 Markdown 制品，通过 AI Agent 的 slash command 驱动：

| 阶段 | 命令 | 产出 | 作用 |
|------|------|------|------|
| 宪法 | `/speckit.constitution` | 项目原则文档 | 定义项目级约束（一次性） |
| 规格 | `/speckit.specify` | spec.md | 定义 What 和 Why，禁止涉及 How |
| 澄清 | `/speckit.clarify` | 问题列表 | AI 反向质询，暴露模糊点 |
| 方案 | `/speckit.plan` | plan.md + data-model.md + contracts/ | 技术方案、数据模型、API 契约 |
| 任务 | `/speckit.tasks` | tasks.md | 从 plan 拆解可执行任务，标记可并行项 |
| 实现 | `/speckit.implement` | 代码 | 按 tasks 逐步生成代码 |

## Spec Kit 的优点

### 1. 强制 What/Why 与 How 分离
模板约束 AI 在 specify 阶段只描述需求，不涉及实现。防止过早跳入技术细节。

### 2. 显式不确定性标记
要求 AI 用 `[NEEDS CLARIFICATION]` 标记模糊点，而不是默默做假设。减少错误假设传播。

### 3. Constitution 机制
项目级原则（技术栈、代码规范、安全标准）一次定义，持续生效。避免每次对话重复。

### 4. Clarify 质询环节
AI 反过来审问用户，暴露边界情况和未考虑的场景。提高需求完整度。

### 5. 分支 + 目录规范化
每个 feature 自动建 git 分支、建目录结构，spec/plan/tasks 放一起，便于团队协作和版本管理。

## Spec Kit 的问题

### 1. 流水线过长，误差累积
6 个阶段串行执行，每个阶段依赖上一阶段的 Markdown 输出。任何一步的模糊或错误都会传播放大，到 implement 阶段已经是"对文档的解释的解释"。

### 2. 上下文稀释
生成大量模板化 Markdown（checklist、marker、header），占用 AI 上下文窗口。真正重要的业务意图被样板内容淹没。

### 3. 中间文档与代码脱节
implement 阶段 AI 读 Markdown 文档生成代码，而不是直接看已有代码库。对 Brownfield（已有项目）场景适配差。

### 4. 工具链复杂度高
需要安装 uv/pipx、Python 3.11+、Specify CLI，还有 preset/extension 生态。学习成本和维护成本高于实际收益。

### 5. 对已有项目（修 bug、加功能）过重
全套流水线适合 0-to-1 的 Greenfield 项目，但日常开发中大部分工作是在已有代码上修改，不需要从 constitution 开始。

### 6. 用户时间花在"喂模板"上
用户大量时间用于学习 Spec Kit 格式、审查中间文档、修正 spec 后重新走流水线，而不是解决实际问题。

---

## 调研对象二

**OpenSpec** (Fission-AI/OpenSpec) — 52K+ stars，TypeScript/Node.js 实现，MIT 协议。自称"最受欢迎的 spec 框架"。

## OpenSpec 核心工作流

### 两种模式

**Core 模式（默认，精简）：**
```
/opsx:propose → /opsx:apply → /opsx:sync → /opsx:archive
```

**Expanded 模式（完整）：**
```
/opsx:new → /opsx:continue|/opsx:ff → /opsx:apply → /opsx:verify → /opsx:archive
```

### 核心命令

| 命令 | 作用 |
|------|------|
| `/opsx:explore` | 探索性对话，不生成制品，用于需求不明确时 |
| `/opsx:propose` | 一步生成全部规划制品（proposal + specs + design + tasks） |
| `/opsx:new` | 仅创建 change 目录骨架 |
| `/opsx:continue` | 按依赖链逐个生成下一个制品 |
| `/opsx:ff` | 快进，一次生成所有规划制品 |
| `/opsx:apply` | 按 tasks.md 逐步实现代码 |
| `/opsx:verify` | 校验实现与 spec 的一致性（完整性/正确性/一致性） |
| `/opsx:sync` | 将 delta spec 合并到主 spec |
| `/opsx:archive` | 归档已完成的 change |

### 制品体系（spec-driven schema）

```
openspec/changes/<change-name>/
├── .openspec.yaml     # 元数据
├── proposal.md        # Why：为什么做这个改动
├── specs/             # What：需求规格（按能力分目录）
│   └── <capability>/spec.md
├── design.md          # How：技术设计方案
└── tasks.md           # 实现任务清单（checkbox 格式）
```

依赖链：`proposal → specs + design → tasks → apply`

### 目录结构设计

```
openspec/
├── specs/             # 主规格库（长期维护的 source of truth）
├── changes/           # 进行中的变更
│   ├── <change-name>/ # 每个变更一个目录
│   └── archive/       # 已归档的变更
└── config.yaml        # 项目配置
```

## OpenSpec 相比 Spec Kit 的改进

### 1. 流式而非刚性阶段
不强制按顺序走，可以随时跳回修改任意制品。Spec Kit 是严格的线性流水线。

### 2. Brownfield 友好
明确定义了 delta spec 操作（ADDED/MODIFIED/REMOVED/RENAMED），支持对已有系统做增量描述，不需要从头写全套 spec。

### 3. 可定制 Schema
工作流通过 schema.yaml 定义，用户可以自定义制品类型、依赖关系、模板。Spec Kit 的流程硬编码在代码里。

### 4. Explore 命令
在不确定需求时可以先探索、调研，不生成任何制品。Spec Kit 没有类似机制。

### 5. Verify 环节
实现完成后可以校验代码与 spec 的一致性，检查三个维度（完整性/正确性/一致性）。

### 6. 并行变更支持
可以同时处理多个 change，通过 change-name 切换上下文。

## OpenSpec 仍然存在的问题

### 1. 制品数量仍然过多
虽然比 Spec Kit 灵活，但仍然是 proposal + specs + design + tasks 四个制品，每个都是大段 Markdown。对中小型任务来说过重。

### 2. 上下文窗口压力未解决
AI 在 apply 阶段需要读取所有制品 + 代码库。制品越多越详细，留给代码理解的上下文越少。

### 3. 模板指令过于详细
schema.yaml 中每个 artifact 的 instruction 非常长（spec 的 instruction 就有 40+ 行），模板本身占用大量 token。

### 4. Sync/Archive 复杂度
delta spec 的合并逻辑（ADDED/MODIFIED/REMOVED）增加了理解和维护成本。对于大多数个人开发场景过度设计。

### 5. 仍需安装外部工具
需要 Node.js 20.19+，npm 全局安装，openspec init 初始化。虽然比 Spec Kit 轻量，但仍有工具链依赖。

### 6. 制品与代码的同步难题
即使有 verify 命令，制品和代码随时间推移仍然会脱节。维护制品的成本最终会被团队忽略。

---

## 两者对比总结

| 维度 | Spec Kit | OpenSpec |
|------|----------|---------|
| 语言 | Python | TypeScript |
| 工作流 | 严格线性 6 阶段 | 流式，可跳转 |
| Brownfield 支持 | 差 | 好（delta spec） |
| 可定制性 | 中（preset/extension） | 好（schema.yaml） |
| 制品数量 | 多（6+文件） | 中（4文件） |
| 探索模式 | 无 | 有（/opsx:explore） |
| 验证环节 | 无 | 有（/opsx:verify） |
| 安装复杂度 | 高（Python + uv） | 中（Node.js + npm） |
| 核心问题 | 流水线过长 | 仍然过重 |
| 共同问题 | 都有上下文稀释、制品维护成本、工具链依赖 |

---

---

## 调研对象三

**agent-spec** (ZhangHanDong/agent-spec) — 260 stars，Rust 实现，MIT 协议。定位：AI-native BDD/spec 验证工具。

## agent-spec 核心理念

与 Spec Kit 和 OpenSpec 完全不同的路线：

```
人写 Contract → Agent 实现代码 → 机器验证是否满足 Contract
```

**不做需求生成，不做方案规划，专注于"验证"这一环节。**

## Task Contract 结构

一个 `.spec` 文件包含四个核心部分：

```spec
spec: task
name: "User Registration API"
---

## Intent          — 做什么，为什么做
## Decisions       — 已经确定的技术决策
## Boundaries      — 允许改什么，禁止改什么
## Completion Criteria — BDD 场景（Given/When/Then + 显式测试绑定）
```

关键设计：每个 Scenario 必须绑定一个具体的测试函数名（`Test:` selector）。

## 核心命令

| 命令 | 作用 |
|------|------|
| `contract` | 渲染 Task Contract 视图 |
| `plan` | 生成 Contract + 代码库上下文 + 任务骨架 |
| `lint` | 分析 spec 质量（模糊动词、缺失测试选择器等） |
| `verify` | 验证代码是否满足 spec |
| `lifecycle` | lint + verify + report（主质量门禁） |
| `guard` | 仓库级预提交检查 |
| `explain` | 生成 PR 描述（替代人工 Code Review） |
| `stamp` | 输出 git trailers 用于提交追踪 |

## agent-spec 的优点

### 1. 聚焦验证，不做过多抽象
不生成 proposal、design 等中间文档，只关注"Contract 是否被满足"。大幅减少了上下文稀释。

### 2. 显式测试绑定
每个 BDD 场景必须绑定具体的测试函数，验证结果是确定性的（pass/fail/skip/uncertain），不是 AI 的主观判断。

### 3. Boundaries 机械化执行
通过 `Allowed Changes` 和 `Forbidden` 声明文件路径约束，guard 可以机械地检查变更是否越界。

### 4. 项目级继承
`project.spec` 定义全局约束，所有 task spec 自动继承。类似 Spec Kit 的 Constitution 但更精简。

### 5. 自举（Self-bootstrapping）
agent-spec 自己用 agent-spec 管理开发——specs/ 目录下全是真实的 task contract。

### 6. 四态验证结果
pass/fail/skip/uncertain 比简单的 pass/fail 更诚实。AI 无法确定的场景标记为 uncertain 而非假装通过。

### 7. Contract Acceptance 替代 Code Review
PR 评审只看两个问题：(1) Contract 定义正确吗？(2) 验证全部通过吗？简化了 Review 流程。

## agent-spec 的问题

### 1. 门槛高
Rust 实现，需要 cargo install。对非 Rust 项目的用户来说安装和理解成本高。

### 2. 手动编写 Contract 成本
用户需要手工编写 Intent/Decisions/Boundaries/Completion Criteria，包括 BDD 场景和测试选择器。这本身就是一项需要技能的工作。

### 3. 不覆盖需求梳理和方案设计
只做验证环节，不帮助用户从模糊想法到清晰需求的转化。用户到达 agent-spec 之前的工作仍需自行完成。

### 4. 测试绑定假设测试已存在
显式 `Test:` selector 要求先有测试函数名，但在实现前测试还不存在。存在先有鸡还是先有蛋的问题。

### 5. 生态较小
260 stars，社区和文档相比前两者薄弱。

---

## 三者对比总结

| 维度 | Spec Kit | OpenSpec | agent-spec |
|------|----------|---------|------------|
| 定位 | 全流程 SDD | 全流程 SDD | 验证/质量门禁 |
| 语言 | Python | TypeScript | Rust |
| Stars | 107K | 52K | 260 |
| 流水线 | 6 阶段线性 | 4 制品流式 | 无流水线，单文件 Contract |
| 需求梳理 | specify + clarify | propose + explore | 无（手写 Contract） |
| 方案设计 | plan | design | 无（Decisions 字段简述） |
| 验证能力 | 无 | verify（AI 判断） | lifecycle（测试绑定 + 机械验证） |
| Brownfield | 差 | 好 | 好（Boundaries 设计） |
| 上下文开销 | 高 | 中 | 低 |
| 安装复杂度 | 高 | 中 | 高（Rust 编译） |
| 核心价值 | 方法论完整 | 灵活 + 可定制 | 验证严谨 + 确定性 |
| 核心问题 | 过重 | 仍偏重 | 不覆盖前期流程 |

---

## 我们的改进方向

核心原则：**综合三者精华，做一个更轻、更快、更准的 spec 工具。**

### 从 Spec Kit 保留
- What/Why 先行，How 后行的思想
- 显式标记不确定性，不让 AI 瞎猜
- 项目级约束（Constitution）持续生效
- 需求质询/挑战环节

### 从 OpenSpec 保留
- 流式而非刚性阶段，可以灵活跳转
- Brownfield delta 思维（增量描述变更）
- Explore 探索模式
- 可定制 schema

### 从 agent-spec 保留
- 单文件 Contract 设计（Intent/Decisions/Boundaries/Criteria）
- 显式测试绑定 + 确定性验证
- Boundaries 路径约束的机械化执行
- 四态验证结果（pass/fail/skip/uncertain）
- Contract Acceptance 替代传统 Code Review

### 我们要解决的核心问题
1. **上下文稀释**：减少模板样板，把 token 留给真正重要的业务逻辑和代码
2. **流水线过长**：自适应阶段选择——小任务直接做，大任务才走完整流程
3. **工具链依赖**：零安装，纯 Markdown/DSL + AI Agent 技能即可运行
4. **制品与代码脱节**：AI 直接看代码库，制品是"约束"不是"中间传递物"
5. **手写 Contract 成本**：AI 辅助生成 Contract，人只需审核和补充
