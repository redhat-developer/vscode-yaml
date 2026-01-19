import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/smoke-test/**/*.test.js',
  workspaceFolder: './smoke-test/',
});
