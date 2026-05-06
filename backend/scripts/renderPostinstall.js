/* eslint-disable no-console */
'use strict';

const { execSync } = require('child_process');

const run = (command) => {
    execSync(command, {
        stdio: 'inherit',
        shell: '/bin/bash',
    });
};

if (process.env.RENDER !== 'true') {
    console.log('[postinstall] Skipping frontend build (RENDER is not true).');
    process.exit(0);
}

console.log('[postinstall] Render environment detected. Building frontend bundle...');
run('npm ci --prefix ../frontend');
run('NODE_OPTIONS="--openssl-legacy-provider --max-old-space-size=384" CI=false npm run build --prefix ../frontend');
run('test -f ../frontend/build/index.html');
console.log('[postinstall] Frontend build complete.');
