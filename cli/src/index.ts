import { Command } from 'commander';
import ora from 'ora';
import { VERSION } from './version.js';

const program = new Command();

program
  .name('taskpact')
  .description('Contract-driven AI coding — let agents follow contracts, not vibes')
  .version(VERSION);

program
  .command('init [path]')
  .description('Install taskpact skills + scaffold .spec/ in your project')
  .option('-y, --yes', 'non-interactive: install for detected agents (or Claude Code)')
  .option('-a, --agent <ids...>', 'install for specific agent ids (e.g. claude cursor)')
  .option('--all', 'install for every supported agent')
  .action((path = '.', opts) =>
    run(async () => {
      const { initCommand } = await import('./commands/init.js');
      await initCommand(path, opts);
    })
  );

program
  .command('update [path]')
  .description('Re-write taskpact skill files to the current version (never touches .spec/config.md)')
  .option('-a, --agent <ids...>', 'update specific agent ids')
  .option('--all', 'update every supported agent')
  .action((path = '.', opts) =>
    run(async () => {
      const { updateCommand } = await import('./commands/update.js');
      await updateCommand(path, opts);
    })
  );

program
  .command('status [path]')
  .description('Show every contract, its real phase, and the next step (read-only)')
  .option('-c, --contract <name>', 'show only one contract')
  .action((path = '.', opts) =>
    run(async () => {
      const { statusCommand } = await import('./commands/status.js');
      await statusCommand(path, opts);
    })
  );

program
  .command('guard [path]')
  .description('Fail if git changes fall outside the active contract boundaries (pre-commit/CI gate)')
  .option('-c, --contract <name>', 'guard against a specific contract')
  .action((path = '.', opts) =>
    run(async () => {
      const { guardCommand } = await import('./commands/guard.js');
      await guardCommand(path, opts);
    })
  );

async function run(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    // Ctrl-C / Esc out of an inquirer prompt — exit quietly, not with a stack trace.
    if ((error as Error)?.name === 'ExitPromptError') {
      console.log();
      ora().info('Cancelled.');
      process.exit(130);
    }
    console.log();
    ora().fail(`Error: ${(error as Error).message}`);
    process.exit(1);
  }
}

export { program };

export function runCli(argv = process.argv): void {
  program.parse(argv);
}
