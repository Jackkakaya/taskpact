# taskpact: 项目初始化

AI 引导式项目初始化。扫描项目，生成 `.spec/config.md`，帮用户快速进入开发状态。

> 这一步和 CLI 的 `npx taskpact init` **不是一回事**：CLI 负责把技能文件铺进你的工具（一次性），本技能负责**扫描你的项目、填好 config.md**（每个项目一次）。先跑 CLI，再跑这个。

## 输入

用户调用 `/taskpact-init`，可选带一句话描述：

```
/taskpact-init
/taskpact-init 我要做一个 Todo API
/taskpact-init 帮我初始化一个 React + Express 项目
```

---

## 前置检查

```
1. 检查 .spec/ 目录是否存在
   - 不存在 → 提示用户先运行 `npx taskpact init` 安装技能文件，然后再回来
   - 存在 → 继续

2. 检查 .spec/config.md 内容
   - 不存在，或是骨架（全是 <!-- 占位注释 -->、无实际内容）→ 视为未初始化，继续扫描填充
   - 已有实际内容 → 展示当前配置，问用户是否要重新扫描覆盖（保留用户手填的项目原则）
```

---

## 流程

### Step 1: 理解意图

根据用户的输入判断场景：

**场景 A：已有项目，初始化 taskpact**
用户在一个已有代码的项目里运行，没有特别的需求描述。
→ 扫描项目，生成 config.md，完成。

**场景 B：已有项目 + 有具体需求**
用户在已有项目里运行，并带了需求描述（如"我要加一个用户注册功能"）。
→ 扫描项目，生成 config.md，然后自动衔接到 `/taskpact-clarify` 流程。

**场景 C：空项目 + 有需求描述**
用户在空目录运行，并描述了想做什么（如"帮我初始化一个 React + Express 项目"）。
→ 搭建最小可运行脚手架，生成 config.md，然后询问用户是否要开始第一个合约。

**判断规则：**
```
目录下有源代码文件（.ts/.py/.go/.java 等）？
  有 → 已有项目（场景 A 或 B）
  无 → 空项目（场景 C）

用户带了需求描述？
  有 → 场景 B 或 C
  无 → 场景 A
```

### Step 2: 扫描项目

**已有项目（场景 A/B）：**

扫描并收集以下信息：

```
1. 项目标志文件 → 推断技术栈
   package.json → Node.js (读 dependencies 进一步判断框架)
   go.mod → Go
   Cargo.toml → Rust
   pom.xml → Java (Maven)
   build.gradle → Java (Gradle)
   pyproject.toml / setup.py → Python
   ...

2. 目录结构 → 理解代码组织
   src/、tests/、lib/ 等目录的存在和布局

3. 已有测试 → 推断测试框架和命名风格
   grep -r "describe\|it(\|test(" tests/ 或 src/
   查看 test runner 配置（jest.config、vitest.config、pytest.ini 等）

4. 构建配置 → 推断构建命令
   package.json scripts → npm run build / npm test
   Makefile → make build / make test
   Dockerfile → 了解部署方式

5. 已有 CI 配置 → 了解项目约束
   .github/workflows/ → 看跑了什么检查
```

**空项目（场景 C）：**

根据用户描述的需求，决定技术栈并搭建脚手架：

```
1. 追问关键信息（如果描述不够明确）：
   - 用什么语言/框架？
   - 前端、后端、还是全栈？

2. 搭建项目结构
   - 创建目录结构（src/、tests/ 等）
   - 生成项目配置文件（package.json、tsconfig.json 等）
   - 安装基础依赖
   - 创建入口文件
   - 创建基础测试配置

3. 确保项目能跑
   - 运行构建命令验证
   - 运行测试命令验证（即使没有测试用例，框架要能跑通）
```

### Step 3: 收集项目原则

**在生成 config.md 之前，主动询问用户整个开发过程中必须遵循的规则。**

这些原则对所有合约生效：clarify 会参考它做推荐，implement 和 verify 会在结尾**逐条核对**每条原则、把核对结果写进合约的验证记录。所以原则写得越可核对越好——能机械校验的（如 lint、覆盖率），尽量写清判断标准。

```
问: 有没有整个项目必须遵循的开发原则？比如代码规范、架构约束、质量标准、安全策略等。
推荐: 基于项目扫描结果给出推荐（例如从 .eslintrc 推断代码规范，从已有测试推断测试策略）。
```

用户可以直接接受推荐，也可以补充、修改。如果用户没有特别的原则，保持为空即可。

### Step 4: 生成 config.md

基于扫描结果和用户确认的项目原则，生成完整的 `.spec/config.md`。

**config.md 只存静态项目配置——不存"当前状态/阶段"。** 现在该做什么由各合约的 status 推导，config.md 不重复记录，避免两套状态漂移。

```markdown
# 项目配置

## 上下文
Node.js + TypeScript + Express REST API。
使用 Vitest 做测试，pnpm 管理依赖。

## 操作命令
- 构建: npm run build
- 测试: npm test
- 单测: npx vitest run -t "<test_name>"
- 启动: npm run dev

## 项目原则
- 所有 API 返回 JSON，错误用 { code, message } 格式
- TypeScript strict 模式，禁止 any
- 测试覆盖率 ≥ 80%
```

**展示给用户确认。** 用户可以修改。确认后写入文件。

### Step 5: 创建目录结构

```
.spec/
├── config.md       ← 刚生成的
└── contracts/      ← 空目录，合约会放这里
```

### Step 6: 衔接下一步

**场景 A（纯初始化）：**
```
taskpact 初始化完成！

已创建:
  ✓ .spec/config.md
  ✓ .spec/contracts/

下一步: /taskpact <你的需求>   （会自动开始澄清）
       或直接 /taskpact-clarify <你的需求>
```

**场景 B（已有项目 + 有需求）：**
```
taskpact 初始化完成！现在帮你开始第一个合约。
```
然后直接进入 clarify 流程，把用户的需求描述作为输入。

**场景 C（空项目 + 有需求）：**
```
项目脚手架搭建完成！

已创建:
  ✓ 项目结构（src/、tests/、package.json 等）
  ✓ .spec/config.md
  ✓ .spec/contracts/

要不要为你的第一个功能创建合约？（/taskpact-clarify）
```
用户同意后进入 clarify 流程。

---

## 注意事项

- **不要瞎猜技术栈。** 看文件、读配置、查依赖。推断不出来就问用户。
- **config.md 的操作命令必须能跑。** 如果你写了 `npm test`，先确认 package.json 里有 test script。
- **单测命令格式很重要。** 这是 implement 和 verify 阶段跑单个场景测试用的，必须准确（含 `<test_name>` 占位符）。
- **脚手架要能构建通过。** 搭完就跑一遍构建和测试，确保基础是稳的。
- **不要过度初始化。** 用户要的是能工作的起点，不是完美的项目模板。该简洁就简洁。
- **重新初始化时保留用户手填的项目原则**，不要无脑覆盖用户的配置。
