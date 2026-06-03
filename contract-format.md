# 合约格式规范 v0.3

借鉴 [ZhangHanDong/agent-spec](https://github.com/ZhangHanDong/agent-spec) 的 Task Contract 设计：四个部分，每个有明确作用，没有冗余。

## 合约文件结构

```
<project>/.spec/
├── config.md                          # 项目级【静态】配置（上下文 + 操作命令 + 项目原则）
└── contracts/
    ├── user-register.md               # 每个合约一个文件，frontmatter 的 status 是唯一状态源
    ├── fix-login-bug.md
    └── ...
```

**单一真相源：** "现在该做什么"完全由各合约 frontmatter 的 `status` 推导，config.md **不再记录"当前状态/阶段"**——避免两套状态各写各的、clear 后漂移。`npx taskpact status` 会用代码确定性地从合约算出真实阶段。

## Frontmatter

```yaml
---
spec: task                    # 类型：task | bug | refactor
name: "简短名称"
status: draft                 # draft → agreed → in_progress → done ⇄ needs-review
round: 0                     # 当前验证轮次
max_rounds: 3                # 最大轮次，超过仍 fail 则转 needs-review
created: 2026-06-02
updated: 2026-06-02
---
```

### 状态流转

```
draft         → 用户和 AI 正在澄清需求（clarify 设置）
agreed        → 合约锁定，等待实现（clarify 设置）
in_progress   → 实现中 或 验证发现 [必须] fail 需修复（implement / verify 设置）
done          → 所有 [必须] 场景 pass，且无 [必须] fail/uncertain（implement / verify 设置）
needs-review  → 需人工介入：[必须] 场景 uncertain，或超过 max_rounds 仍 fail（implement / verify 设置）

  draft → agreed → in_progress → done
                       ↑   ↓ ↘
                       └───┘  needs-review
                     (verify 发现 [必须] fail 回 in_progress；
                      [必须] uncertain 或超轮次 → needs-review；
                      人工处理后回 in_progress 或 done)
```

**为什么要 needs-review：** done 是"绿灯可信"的承诺。如果一个 [必须] 场景 AI 都拿不准是否满足，置 done 就是把不确定性藏起来骗用户。诚实地转 needs-review，让人来拍板。非 [必须] 场景的 uncertain/skip 不阻塞 done。

## 正文四个部分

### 1. 意图（必填）

做什么，为什么做。2-3 句话。

```markdown
## 意图

实现用户注册 API，支持邮箱+密码注册。
为后续登录、密码重置功能打基础。
```

### 2. 已定决策（可选）

已经确定的技术选择，不需要 AI 再做判断。

```markdown
## 已定决策

- 使用 POST /api/v1/users/register 作为唯一入口
- 密码使用 bcrypt 哈希后存储
- 返回统一错误码格式 {code, message}
```

### 3. 边界（推荐）

允许改什么、禁止做什么。AI 必须遵守，并且**可被机械化校验**：`npx taskpact guard` 会解析"允许修改"的 glob，对 `git diff` 做白名单检查，越界则非零退出（可挂 pre-commit 或 CI）。`.spec/**` 始终被允许。

```markdown
## 边界

### 允许修改
- src/api/auth/**
- src/pages/register/**
- tests/integration/register.test.ts

### 禁止做
- 不要修改现有 login 接口
- 不要修改数据库 migration 文件
- 不要引入新的外部依赖
```

### 4. 完成条件（必填）

BDD 场景，每个场景是一个独立的验收检查项。这是合约的核心。

```markdown
## 完成条件

场景: 注册成功 [必须]
  测试: test_register_returns_201
  假设 不存在邮箱为 "alice@example.com" 的用户
  当 客户端提交注册请求:
    | 字段     | 值                |
    | email    | alice@example.com |
    | password | Str0ng!Pass#2026  |
  那么 响应状态码为 201
  并且 响应体包含字段 "user_id"

场景: 重复邮箱被拒绝 [必须]
  测试: test_register_rejects_duplicate_email
  假设 已存在邮箱为 "alice@example.com" 的用户
  当 客户端提交相同邮箱的注册请求
  那么 响应状态码为 409
  并且 响应体包含错误码 "USER_ALREADY_EXISTS"

场景: 注册页面布局 [应该]
  验证方式: 代码审查
  假设 用户访问注册页面
  那么 页面居中显示注册表单，max-width: 400px
  并且 包含邮箱输入框、密码输入框、注册按钮
  并且 主按钮使用 Ant Design Primary Button，颜色 #1677ff
```

**场景的两种验证方式：**

| 字段 | 含义 |
|------|------|
| `测试: test_function_name` | 通过运行指定测试函数验证，结果确定性的 |
| `验证方式: 代码审查` | 通过读代码检查，AI 判断，可能产生 uncertain |

有 `测试:` 绑定的场景，验证结果由测试决定，不依赖 AI 判断。
没有测试绑定的场景（UI 类），通过代码审查验证，可能产生 uncertain。

**场景优先级：**

| 标记 | 含义 | implement 行为 | verify 行为 |
|------|------|---------------|-------------|
| `[必须]` | MVP，不做不能交付 | 必须实现并通过 | fail → fail；uncertain → needs-review |
| `[应该]` | 重要但不阻塞交付 | 尽量完成 | 未实现 → skip |
| `[可选]` | 有更好，没有也行 | 有余力再做 | 未实现 → skip |

## 验证记录（implement 和 verify 共同维护）

只保留**最近一轮**的验证结果，不累积追加。防止文件膨胀。历史轮次仍可从 git log 的 `[taskpact]` 提交里回溯。

```markdown
## 验证记录

来源: 自验证
轮次: 2
时间: 2026-06-02 15:10

- 注册成功: pass
- 重复邮箱被拒绝: fail — 期望 409，实际 500。UserService.register() 缺少重复检查。
- 注册页面布局: uncertain — 无法运行 UI，代码中 max-width 值正确但无法确认渲染效果。
- OAuth 登录 [可选]: skip — 未实现
功能验证: 已运行 curl POST /api/v1/users/register，确认注册流程正常

结论: 1 pass, 1 fail, 1 uncertain, 1 skip
需人工确认: 注册页面布局
```

**来源** 区分谁写的：`自验证`（implement 写）或 `交叉验证`（verify 写）。
**skip** 表示 `[应该]`/`[可选]` 场景未实现，不等于 fail，不阻塞 done。

## 项目级配置 config.md

```markdown
# 项目配置

## 上下文
后端: Java 17 + Spring Boot 3.2
前端: React 18 + TypeScript + Ant Design 5
数据库: MySQL 8.0

## 操作命令
- 构建: mvn clean compile（后端）/ npm run build（前端）
- 测试: mvn test -pl <module>（后端）/ npm test -- --grep <pattern>（前端）
- 单测: mvn test -Dtest=<ClassName#methodName>
- 启动: mvn spring-boot:run（后端）/ npm run dev（前端）

## 项目原则
- 不允许明文存储密码
- API 必须有统一错误码格式 {code, message}
- 所有公开 API 必须有集成测试
```

**config.md 只存静态配置——不存"当前状态/阶段"。** 哪个合约在途、进行到哪个阶段，一律扫描 `.spec/contracts/` 的 `status` 推导（`npx taskpact status` 即此）。这样状态只有一处真相，不会两处打架。

**操作命令是关键。** 特别是 `单测` 命令（需含 `<test_name>` 占位符）——implement 和 verify 用它运行单个场景测试。
