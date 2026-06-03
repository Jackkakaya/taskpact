#!/usr/bin/env node
// Reads ../../skills/*.md and generates src/core/skills.ts with embedded content.
// Single source for skill metadata (id/description/argHint) lives here.

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.resolve(__dirname, '../../skills');
const OUTPUT = path.resolve(__dirname, '../src/core/skills.ts');

// Order matters: the entry skill goes first.
const skills = [
  { id: 'taskpact', description: '智能入口：读状态自动决定下一步', argHint: "[需求或'状态']" },
  { id: 'taskpact-init', description: '扫描项目、生成 .spec/config.md', argHint: '[项目描述]' },
  { id: 'taskpact-clarify', description: '把模糊需求转化为精准的合约', argHint: '<需求描述>' },
  { id: 'taskpact-implement', description: '按合约逐条实现功能', argHint: '[合约名]' },
  { id: 'taskpact-verify', description: '逐条验证合约完成条件', argHint: '[合约名]' },
  { id: 'taskpact-status', description: '只读：渲染所有合约的进度表', argHint: '[合约名]' },
];

let output = `// Auto-generated from ../../skills/*.md — run "npm run build:skills" to update.
// Do not edit manually.

export interface SkillDef {
  id: string;
  description: string;
  argHint: string;
  content: string;
}

export const SKILLS: SkillDef[] = [\n`;

for (const skill of skills) {
  const filePath = path.join(SKILLS_DIR, `${skill.id}.md`);
  const content = readFileSync(filePath, 'utf-8');
  const escaped = content.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
  output += `  {
    id: '${skill.id}',
    description: '${skill.description}',
    argHint: '${skill.argHint.replace(/'/g, "\\'")}',
    content: \`${escaped}\`,
  },\n`;
}

output += `];\n`;

writeFileSync(OUTPUT, output, 'utf-8');
console.log(`Generated ${OUTPUT} (${skills.length} skills embedded)`);
