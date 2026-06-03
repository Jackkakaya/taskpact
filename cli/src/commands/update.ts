import fs from 'fs';
import path from 'path';
import ora from 'ora';
import { showWelcome } from '../ui/welcome.js';
import * as log from '../ui/logger.js';
import { AGENTS, type AgentDef } from '../core/agents.js';
import { detectAgents } from '../core/detect.js';
import { getInstallFiles } from '../core/adapters.js';
import { memoryTargets, renderMemoryBlock, upsertMemoryBlock } from '../core/memory.js';
import { SKILLS } from '../core/skills.js';
import { VERSION } from '../version.js';

export interface UpdateOptions {
  agent?: string[];
  all?: boolean;
}

/**
 * Re-write the taskpact skill files to the current version. Never touches
 * .spec/config.md or .spec/contracts/ — those are user/AI-owned state.
 */
export async function updateCommand(targetPath: string, options: UpdateOptions = {}): Promise<void> {
  const projectPath = path.resolve(targetPath);
  showWelcome(VERSION);

  let agents: AgentDef[];
  if (options.all) {
    agents = AGENTS;
  } else if (options.agent && options.agent.length > 0) {
    agents = AGENTS.filter((a) => options.agent!.includes(a.id));
  } else {
    // Update whatever is already installed in this project.
    agents = detectAgents(projectPath).filter((a) =>
      getInstallFiles(a, SKILLS).some((f) => fs.existsSync(path.join(projectPath, f.path)))
    );
  }

  if (agents.length === 0) {
    log.warn('No installed taskpact agents detected. Run `taskpact init` first, or pass --agent <id>.');
    return;
  }

  const spinner = ora('Updating taskpact files...').start();
  let count = 0;
  for (const agent of agents) {
    for (const file of getInstallFiles(agent, SKILLS)) {
      const abs = path.join(projectPath, file.path);
      // Don't clobber user-owned root rule files (e.g. Zed .rules) on update.
      if (file.clobberRisk && fs.existsSync(abs)) continue;
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, file.content, 'utf-8');
      count++;
    }
  }
  spinner.succeed(`Updated ${count} file(s) to v${VERSION}`);

  for (const a of agents) log.success(`${a.name} (${a.dir})`);

  // Refresh the taskpact managed block in root memory files (idempotent).
  const memBlock = renderMemoryBlock(VERSION);
  const memFiles = memoryTargets(agents);
  for (const rel of memFiles) {
    const abs = path.join(projectPath, rel);
    const existing = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf-8') : '';
    const next = upsertMemoryBlock(existing, memBlock);
    if (next !== existing) {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, next, 'utf-8');
    }
  }
  log.info(`.spec/config.md and .spec/contracts/ left untouched. Rules reminder refreshed in ${memFiles.join(', ')}.`);
}
