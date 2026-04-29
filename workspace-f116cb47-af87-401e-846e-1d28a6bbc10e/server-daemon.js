const { spawn } = require('child_process');
const fs = require('fs');
const log = fs.openSync('/home/z/my-project/dev.log', 'a');

const child = spawn('node', ['node_modules/.bin/next', 'dev', '-p', '3000'], {
  stdio: ['ignore', log, log],
  detached: true,
  env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512' }
});
child.unref();
console.log(`Server started PID: ${child.pid}`);
