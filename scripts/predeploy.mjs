import { writeFileSync } from 'node:fs';

// Astro regenerates dist/ on every build, so the .assetsignore must be recreated before each deploy.
writeFileSync(new URL('../dist/.assetsignore', import.meta.url), '_worker.js\n');
console.log('predeploy: wrote dist/.assetsignore (_worker.js)');
