import chalk from 'chalk';

export function success(msg: string): void {
  console.log(chalk.green('  ✓ ') + msg);
}

export function info(msg: string): void {
  console.log(chalk.cyan('  ℹ ') + msg);
}

export function warn(msg: string): void {
  console.log(chalk.yellow('  ⚠ ') + msg);
}

export function error(msg: string): void {
  console.log(chalk.red('  ✗ ') + msg);
}

export function heading(msg: string): void {
  console.log();
  console.log(chalk.bold(msg));
}

export function dim(msg: string): void {
  console.log(chalk.dim(`    ${msg}`));
}
