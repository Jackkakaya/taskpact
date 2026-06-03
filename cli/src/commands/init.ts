import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { checkbox } from '@inquirer/prompts';
import { showWelcome } from '../ui/welcome.js';
import * as log from '../ui/logger.js';
import { AGENTS, invocationFor, type AgentDef, type Support } from '../core/agents.js';
import { detectAgents } from '../core/detect.js';
import { getInstallFiles } from '../core/adapters.js';
import { memoryTargets, renderMemoryBlock, upsertMemoryBlock } from '../core/memory.js';
import { SKILLS } from '../core/skills.js';
import { VERSION } from '../version.js';

export interface InitOptions {
  yes?: boolean;
  agent?: string[];
  all?: boolean;
}

export async function initCommand(targetPath: string, options: InitOptions = {}): Promise<void> {
  const projectPath = path.resolve(targetPath);
  showWelcome(VERSION);

  const specDir = path.join(projectPath, '.spec');
  const configPath = path.join(specDir, 'config.md');
  const configExists = fs.existsSync(configPath);

  // Resolve which agents to install for.
  const selectedAgents = await resolveAgents(projectPath, options);
  if (selectedAgents.length === 0) {
    log.warn('No agents selected. Nothing to do.');
    return;
  }

  // Install command/skill files.
  const spinner = ora('Writing taskpact files...').start();
  let fileCount = 0;
  const skipped: string[] = [];
  for (const agent of selectedAgents) {
    for (const file of getInstallFiles(agent, SKILLS)) {
      const abs = path.join(projectPath, file.path);
      if (file.clobberRisk && fs.existsSync(abs)) {
        skipped.push(file.path);
        continue;
      }
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, file.content, 'utf-8');
      fileCount++;
    }
  }
  spinner.succeed(`Wrote ${fileCount} file(s)`);
  for (const p of skipped) {
    log.warn(`Kept your existing ${p} — taskpact methodology not written there. Merge manually if you want it.`);
  }

  // Create .spec/ structure. Never overwrite an existing config.md — the
  // /taskpact-init skill (or the user) owns its content; clobbering it would
  // destroy the context/principles they filled in.
  fs.mkdirSync(path.join(specDir, 'contracts'), { recursive: true });
  if (!configExists) {
    fs.writeFileSync(configPath, CONFIG_TEMPLATE, 'utf-8');
    log.success('.spec/config.md created (skeleton)');
  } else {
    log.info('.spec/config.md already exists — kept as is');
  }
  log.success('.spec/contracts/ ready');

  // Sync the taskpact managed block into root memory files (AGENTS.md + each
  // selected agent's memory file). Idempotent and non-destructive: user content
  // outside the taskpact markers is preserved. Keeps "read config.md principles
  // before coding" in front of every agent each session, not just when a skill runs.
  const memBlock = renderMemoryBlock(VERSION);
  const memFiles = memoryTargets(selectedAgents);
  for (const rel of memFiles) {
    const abs = path.join(projectPath, rel);
    const existing = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf-8') : '';
    const next = upsertMemoryBlock(existing, memBlock);
    if (next !== existing) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, next, 'utf-8');
    }
  }
  log.success(`Rules reminder synced to ${memFiles.join(', ')}`);

  printSummary(selectedAgents);
}

async function resolveAgents(projectPath: string, options: InitOptions): Promise<AgentDef[]> {
  if (options.all) return AGENTS;

  if (options.agent && options.agent.length > 0) {
    const out: AgentDef[] = [];
    for (const id of options.agent) {
      const found = AGENTS.find((a) => a.id === id);
      if (found) out.push(found);
      else log.warn(`Unknown agent id "${id}" (ignored). Run with --all to see options.`);
    }
    return out;
  }

  log.heading('Detecting coding agents...');
  const detected = detectAgents(projectPath);
  if (detected.length > 0) {
    for (const a of detected) log.success(`${a.name} (${a.dir})`);
  } else {
    log.warn('No coding agent detected.');
  }

  // Non-interactive: pick detected, else default to Claude Code.
  if (options.yes) {
    const picked = detected.length > 0 ? detected : AGENTS.filter((a) => a.id === 'claude');
    log.info(`--yes: installing for ${picked.map((a) => a.name).join(', ')}`);
    return picked;
  }

  const detectedIds = new Set(detected.map((a) => a.id));
  const choices = AGENTS.map((agent) => ({
    name:
      `${agent.name}` +
      (detectedIds.has(agent.id) ? chalk.dim(' (detected)') : '') +
      supportTag(agent.support),
    value: agent.id,
    checked: detectedIds.has(agent.id) || agent.id === 'claude',
  }));

  const selectedIds = await checkbox({
    message: 'Install taskpact for:',
    choices,
    required: true,
  });
  return AGENTS.filter((a) => selectedIds.includes(a.id));
}

function supportTag(s: Support): string {
  switch (s) {
    case 'slash':
      return chalk.green(' ✓ slash command');
    case 'mention':
      return chalk.cyan(' · @/$ command');
    case 'rule':
      return chalk.dim(' · methodology only');
  }
}

function printSummary(agents: AgentDef[]): void {
  log.heading('taskpact initialized!');
  console.log();
  console.log('  Installed for (how you invoke a phase):');
  for (const a of agents) {
    const how =
      a.support === 'slash'
        ? chalk.green(invocationFor(a, 'taskpact-clarify'))
        : a.support === 'mention'
          ? chalk.cyan(invocationFor(a, 'taskpact-clarify'))
          : chalk.dim('natural language (methodology injected)');
    log.success(`${a.name} ${chalk.dim('—')} ${how}`);
  }

  const ruleOnly = agents.filter((a) => a.support === 'rule');
  if (ruleOnly.length > 0) {
    console.log();
    log.dim(
      `${ruleOnly.length} tool(s) have no per-phase command — taskpact is injected as methodology; trigger phases in natural language.`
    );
  }

  console.log();
  console.log('  Next steps:');
  console.log(chalk.cyan('    1. ') + 'In your AI agent, run ' + chalk.white('/taskpact-init') + ' to scan the project and fill config.md');
  console.log(chalk.cyan('    2. ') + 'Then ' + chalk.white('/taskpact <your requirement>') + ' — it auto-routes clarify → implement → verify');
  console.log(chalk.dim('       (exact invocation differs per tool — see the list above)'));
  console.log();
}

const CONFIG_TEMPLATE = `# 项目配置

## 上下文
<!-- 项目的技术栈、领域等背景信息。/taskpact-init 会自动扫描项目补充。 -->

## 操作命令
<!-- /taskpact-init 会自动扫描项目并填充。单测命令需含 <test_name> 占位符。 -->
<!-- - 构建: ...
     - 测试: ...
     - 单测: ...
     - 启动: ... -->

## 项目原则
<!-- 整个开发过程中所有合约都必须遵循的规则。/taskpact-init 与用户确认。 -->
<!-- 例如：所有 API 返回 JSON、禁止使用 ORM、测试覆盖率 ≥ 80% -->
`;
