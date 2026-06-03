import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import * as log from '../ui/logger.js';
import {
  loadContracts,
  deriveStatus,
  nextStep,
  ACTIVE_STATUSES,
  type Contract,
  type Result,
} from '../core/contract.js';

export interface StatusOptions {
  contract?: string;
}

const ICON: Record<Result, string> = {
  pass: chalk.green('✓'),
  fail: chalk.red('✗'),
  uncertain: chalk.yellow('?'),
  skip: chalk.dim('–'),
  unverified: chalk.dim('○'),
};

const PRIORITY_LABEL: Record<string, string> = {
  required: '[必须]',
  should: '[应该]',
  optional: '[可选]',
};

export async function statusCommand(targetPath: string, options: StatusOptions = {}): Promise<void> {
  const projectPath = path.resolve(targetPath);
  const contractsDir = path.join(projectPath, '.spec', 'contracts');

  if (!fs.existsSync(path.join(projectPath, '.spec'))) {
    log.warn('No .spec/ here. Run `taskpact init` first.');
    return;
  }

  let contracts = loadContracts(contractsDir);
  if (options.contract) {
    contracts = contracts.filter(
      (c) => c.name === options.contract || path.basename(c.file, '.md') === options.contract
    );
  }

  if (contracts.length === 0) {
    log.info('No contracts yet. Run /taskpact-clarify <requirement> to create one.');
    return;
  }

  // In-flight contracts first, then done, then drafts.
  const rank = (c: Contract) =>
    ACTIVE_STATUSES.includes(c.status) ? 0 : c.status === 'done' ? 1 : 2;
  contracts.sort((a, b) => rank(a) - rank(b));

  console.log();
  for (const c of contracts) {
    renderContract(c);
    console.log();
  }
}

function renderContract(c: Contract): void {
  const derived = deriveStatus(c);
  const drift = derived !== c.status && c.status !== 'draft';

  console.log(
    chalk.bold(`合约: ${c.name}`) +
      chalk.dim(`   status: `) + statusColor(c.status) +
      chalk.dim(`   轮次: ${c.round}/${c.maxRounds}`)
  );

  const effective = drift ? derived : c.status;
  if (drift) {
    log.warn(
      `状态可能漂移：frontmatter 写 ${c.status}，但按验证记录应为 ${derived}。建议跑一轮 /taskpact-verify 校正。`
    );
  }

  if (c.scenarios.length === 0) {
    log.dim('（无完成条件场景）');
  } else {
    const counts: Record<string, number> = {};
    for (const s of c.scenarios) {
      counts[s.result] = (counts[s.result] ?? 0) + 1;
      const note = s.note ? chalk.dim(` — ${truncate(s.note, 60)}`) : '';
      console.log(
        `  ${ICON[s.result]} ${s.name} ${chalk.dim(PRIORITY_LABEL[s.priority] ?? '')} ${chalk.dim(s.result)}${note}`
      );
    }
    const summary = ['pass', 'fail', 'uncertain', 'skip', 'unverified']
      .filter((k) => counts[k])
      .map((k) => `${counts[k]} ${k}`)
      .join(' · ');
    log.dim(`小结: ${summary}`);
  }

  console.log(chalk.cyan('  下一步: ') + nextStep(effective));
}

function statusColor(status: string): string {
  switch (status) {
    case 'done': return chalk.green(status);
    case 'in_progress': return chalk.yellow(status);
    case 'needs-review': return chalk.red(status);
    case 'agreed': return chalk.cyan(status);
    default: return chalk.dim(status);
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
