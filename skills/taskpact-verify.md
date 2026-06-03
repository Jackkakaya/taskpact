# taskpact: 交叉验证

独立验证合约完成条件。implement 已经自验证过一轮——你是独立的第二双眼睛。

**你只改合约文件。绝不修改源代码、测试代码或任何其他文件。**

## 核心原则

- **独立判断。** 不依赖 implement 的验证记录，从零开始重新验证每个场景。
- **诚实判定。** fail 就是 fail，uncertain 就是 uncertain。不要美化。
- **失败原因必须可操作。** 让修复的人能直接根据你写的原因定位问题，不需要再调查。

## 输入

用户调用 `/taskpact-verify`，可选指定合约名。

### 合约选择

```
1. 如果用户指定了合约名 → 直接使用
2. 扫描 .spec/contracts/ 下所有合约，筛选 status 为 done 或 in_progress 或 needs-review 的
3. 只有一个候选 → 自动选中
4. 有多个候选 → 列出合约名和 status，让用户选
5. 没有候选 → 告诉用户 "没有可验证的合约"
```

**选中后必须报告：** "验证合约: xxx (status: done, round: N)"

---

## 启动

```
1. 找到目标合约文件，读取全部内容
2. 读取 .spec/config.md → 获取构建命令、测试命令、单测命令、项目原则
3. 检查 status:
   - done          → 正常，交叉验证 implement 的成果
   - in_progress   → 可以验证（可能是手动触发或修复轮）
   - needs-review  → 可以验证，帮人确认那些不确定项
   - 其他          → 停止，状态不对
4. 检查 max_rounds:
   - round >= max_rounds → 仍可跑这一轮验证，但如果验证后还有 [必须] fail，
                           status 判为 needs-review 并提示用户: "已达最大验证轮次 (N)，需人工介入"
```

**状态只写在合约 frontmatter 里。** config.md 不记"当前阶段"。

---

## 先跑构建

用 config.md 中的构建命令编译项目。如果构建失败：

```
- 所有场景直接标记 fail
- 失败原因写 "构建失败" + 错误信息摘要
- 跳到"更新合约"，不用逐条验证
```

---

## 逐条验证

对合约完成条件中的每个场景，根据验证方式判定结果。

**优先级处理规则：**
- `[必须]` 场景：正常验证
- `[应该]` 场景：正常验证，但测试不存在且无实现痕迹 → `skip`
- `[可选]` 场景：测试不存在且无实现痕迹 → `skip`
- `skip` 表示"未实现"，不等于 fail，不阻塞 done

### 有 `测试:` 字段

用 config.md 中的**单测命令**运行指定测试（将 `<test_name>` 替换为场景的测试函数名）。

```
测试通过   → pass
测试失败   → fail，记录测试输出中的错误信息
测试不存在 → [必须] 场景: fail，记录 "测试函数未找到: <函数名>"
             [应该/可选] 场景: skip，记录 "未实现"
```

### 有 `验证方式: 代码审查`

读代码检查是否符合场景描述。

```
能明确判定符合   → pass
能明确判定不符合 → fail，写明哪里不符合
无法确定         → uncertain，写明原因
```

### 都没有

尝试从场景描述推断验证方法。如果实在无法验证 → uncertain。

---

## 核对项目原则

逐条验证完场景后，对照 config.md 的「## 项目原则」做独立核对——你是第二双眼睛，从当前代码和产物重新判断，不采信 implement 的结论。

对每一条项目原则：

```
满足   → 记 满足
违反   → 记 违反 + 哪个文件哪一行违反了哪条原则（你不改代码，写清楚让 implement 去修）
不适用 → 记 不适用（本次改动不涉及这条）
判不准 → 记 uncertain + 原因
```

**项目原则违反 = [必须] 场景 fail；项目原则 uncertain = [必须] uncertain。** 一并代入下面的 status 判定。

---

## 更新合约

验证完成后，更新合约文件中的两个部分：

### 1. 验证记录

如果合约已有 `## 验证记录`，**替换它**（不追加）。如果没有，在末尾添加。

只保留当前这一轮的结果：

```markdown
## 验证记录

来源: 交叉验证
轮次: N
时间: YYYY-MM-DD HH:MM

- 场景名称: pass
- 场景名称: fail — 具体原因（期望 X，实际 Y。问题在 文件:行号）
- 场景名称: skip — [可选] 场景未实现
- 场景名称: uncertain — 原因（无法自动验证 UI 渲染效果）

原则核对:
- 原则一: 满足
- 原则二: 违反 — src/api/x.ts:45 用了 any，违反"TypeScript strict，禁止 any"
- 原则三: 不适用

结论: X pass, Y fail, Z skip, W uncertain
需人工确认: 列出 uncertain 的场景名，以及违反/uncertain 的项目原则
```

### 2. Frontmatter

**更新 status（写入合约 frontmatter，这是唯一真相源）。** 把"项目原则违反"计入 [必须] fail、"项目原则 uncertain"计入 [必须] uncertain，再按下表判定：
```
所有 [必须] 场景 pass，且无 [必须] fail/uncertain（skip 不阻塞）     → status: done
有 [必须] 场景 fail，且 round < max_rounds                          → status: in_progress（通知 implement 修复）
有 [必须] 场景 fail，且 round >= max_rounds                         → status: needs-review（人工介入）
有 [必须] 场景 uncertain（无法判定是否满足）                          → status: needs-review（人工确认）
```

**更新 round：** round 值 +1

**更新 updated：** 今天日期

不需要再去改 config.md——现在该做什么由合约 status 推导，verify 把 status 写对就够了。

---

## 失败原因的写法

失败原因必须包含三要素，让修复的人能直接定位：

```
差: "注册功能有问题"
差: "测试失败了"

好: "期望返回 409，实际返回 500。
    src/api/auth/register.ts:45 的 catch 块没有处理 DuplicateEmailError，
    直接抛出了 InternalServerError。"
```

**三要素：期望什么、实际什么、问题在哪。**

---

## 恢复

verify 每次从零开始验证全部场景，无需增量恢复。
如果被中断（clear 或上下文压缩），直接重新运行 `/taskpact-verify`。
扫描 .spec/contracts/ 找到活跃合约即可开始。

---

## 常见错误

| 你可能犯的错误 | 正确做法 |
|--------------|---------|
| 修改了源代码或测试代码 | 只改合约文件 |
| 没跑构建就开始逐条验证 | 先跑构建，失败则全部 fail |
| 测试没跑就标 pass | 有测试绑定的场景必须用单测命令实际运行 |
| 失败原因写得模糊 | 三要素：期望、实际、位置 |
| 基于实现过程的记忆判断 | 只看当前代码和测试结果 |
| 美化结果，把 fail 写成 uncertain | 能判定的就判定，uncertain 留给真正无法确定的 |
| 把 [必须] uncertain 当 done | [必须] uncertain → needs-review，不置 done |
| 验证记录追加而不是替换 | 只保留当前轮次，覆盖之前的 |
| [可选] 未实现标为 fail | 未实现的 [应该/可选] 标 skip，不是 fail |
| 只验场景，没核对项目原则 | 项目原则逐条核对，违反按 [必须] fail 处理 |
