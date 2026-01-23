import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/**/*.test.js',
  workspaceFolder: '.',
  mocha: {
    ui: 'bdd',
    timeout: 10_000,
  },
});
