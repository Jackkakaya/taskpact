import { createRequire } from 'module';

// Single source of truth for the version: read it straight from package.json.
// Using createRequire avoids `import '../package.json'`, which would pull the
// JSON into the TS rootDir and break the build.
const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

export const VERSION: string = pkg.version;
