import chalk from 'chalk';

const INNER = 32; // inner width between the box borders

export function showWelcome(version: string): void {
  const row = (text: string, paint: (s: string) => string) =>
    chalk.cyan('  ║') + paint(text.padEnd(INNER)) + chalk.cyan('║');

  console.log();
  console.log(chalk.cyan('  ╔' + '═'.repeat(INNER) + '╗'));
  console.log(row(`   taskpact v${version}`, chalk.bold.white));
  console.log(row('   Contract-driven AI coding', chalk.dim));
  console.log(chalk.cyan('  ╚' + '═'.repeat(INNER) + '╝'));
  console.log();
}
