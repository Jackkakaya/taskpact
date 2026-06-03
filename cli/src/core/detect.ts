import fs from 'fs';
import path from 'path';
import { AGENTS, type AgentDef } from './agents.js';

export function detectAgents(projectPath: string): AgentDef[] {
  return AGENTS.filter((agent) => {
    const paths = agent.detectionPaths ?? [agent.dir];
    return paths.some((p) => fs.existsSync(path.join(projectPath, p)));
  });
}
