import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import * as log from '../ui/logger.js';
import { loadContracts, ACTIVE_STATUSES, type Contract } from '../core/contract.js';

export interface GuardOptions {
  contract?: string;
}

/** Always-allowed paths: taskpact's own state files. */
const IMPLICIT_ALLOW = ['.spec/**'];

/**
 * Check that the current git changes stay inside the active contract's
 * "允许修改" boundaries. Exits non-zero on violation so it can be used as a
 * pre-commit hook or CI gate.
 */
export async function guardCommand(targetPath: string, options: GuardOptions = {}): Promise<void> {
  const projectPath = path.resolve(targetPath);
  const contract = pickContract(projectPath, options);
  if (!contract) return; // pickContract already logged + set exit code

  const globs = [...contract.allowedGlobs, ...IMPLICIT_ALLOW];
  if (contract.allowedGlobs.length === 0) {
    log.warn(`合约 "${contract.name}" 没有声明"允许修改"边界，guard 无法校验。`);
    return;
  }

  const changed = changedFiles(projectPath);
  if (changed.length === 0) {
    log.info('No changes to check.');
    return;
  }

  const matchers = globs.map(globToRegExp);
  const violations = changed.filter((f) => !matchers.some((re) => re.test(f)));

  if (violations.length === 0) {
    log.success(`所有改动都在合约 "${contract.name}" 的边界内（${changed.length} 个文件）。`);
    return;
  }

  log.error(`以下改动越界（不在合约 "${contract.name}" 的"允许修改"范围内）：`);
  for (const f of violations) console.log('    ' + f);
  console.log();
  log.info('允许修改：');
  for (const g of contract.allowedGlobs) console.log('    ' + g);
  process.exitCode = 1;
}

function pickContract(projectPath: string, options: GuardOptions): Contract | undefined {
  const contractsDir = path.join(projectPath, '.spec', 'contracts');
  if (!fs.existsSync(contractsDir)) {
    log.warn('No .spec/contracts/ here. Run `taskpact init` first.');
    process.exitCode = 1;
    return undefined;
  }
  const contracts = loadContracts(contractsDir);

  if (options.contract) {
    const c = contracts.find(
      (x) => x.name === options.contract || path.basename(x.file, '.md') === options.contract
    );
    if (!c) {
      log.error(`Contract "${options.contract}" not found.`);
      process.exitCode = 1;
    }
    return c;
  }

  const active = contracts.filter((c) => ACTIVE_STATUSES.includes(c.status));
  if (active.length === 1) return active[0];
  if (active.length === 0) {
    log.warn('No active contract (agreed/in_progress/needs-review). Nothing to guard.');
    return undefined;
  }
  log.error('Multiple active contracts — pass --contract <name> to choose one:');
  for (const c of active) console.log('    ' + c.name);
  process.exitCode = 1;
  return undefined;
}

function changedFiles(projectPath: string): string[] {
  const run = (cmd: string): string[] => {
    try {
      return execSync(cmd, { cwd: projectPath, encoding: 'utf-8' })
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    } catch {
      return [];
    }
  };
  const tracked = run('git diff --name-only HEAD');
  const untracked = run('git ls-files --others --exclude-standard');
  return Array.from(new Set([...tracked, ...untracked]));
}

/** Minimal gitignore-style glob → RegExp. Supports ** (any incl. /), * (no /), ?. */
export function globToRegExp(glob: string): RegExp {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i++;
        if (glob[i + 1] === '/') i++; // collapse "**/" so it also matches zero dirs
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if ('.+^${}()|[]\\'.includes(c)) {
      re += '\\' + c;
    } else {
      re += c;
    }
  }
  return new RegExp('^' + re + '$');
}
