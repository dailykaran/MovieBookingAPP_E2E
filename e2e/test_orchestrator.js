import { spawn } from 'child_process';

console.log('Testing orchestrator...');

const child = spawn('node', ['src/orchestrator.js', '--test-file', 'tests/gemini-pro-demo.spec.ts', '--heal'], {
  cwd: process.cwd(),
  stdio: 'inherit'
});

child.on('close', (code) => {
  console.log(`Orchestrator exited with code: ${code}`);
});