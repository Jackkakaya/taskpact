# 项目配置

## 上下文
taskpact CLI 本体：Node.js + TypeScript ESM（NodeNext），commander + @inquirer/prompts + chalk + ora。
技能内容写在 `/skills/*.md`，由 `cli/scripts/embed-skills.mjs` 内嵌进 `cli/src/core/skills.ts`。
测试用 Vitest，测试文件在 `cli/test/`，导入编译后的 `cli/dist/`。

## 操作命令
- 构建: cd cli && npm run build
- 测试: cd cli && npm test
- 单测: cd cli && npx vitest run -t "<test_name>"
- 启动: node cli/bin/taskpact.js <command>

## 项目原则
- 版本号单一来源：只在 cli/package.json 维护，运行时由 cli/src/version.ts 读取，禁止再硬编码
- 技能元数据（id/description/argHint）单一来源：只在 embed-skills.mjs 维护
- CLI 命令对 .spec/config.md 与 .spec/contracts/ 是只读或仅追加，绝不无条件覆盖用户内容
- 对外宣称的工具支持必须诚实：未端到端验证的标 experimental
- 纯函数（解析、glob、适配）必须有 vitest 单测
