import { assert } from 'chai';
import * as vscode from 'vscode';
import { URI } from 'vscode-uri';

suite('Smoke test suite', function () {
  this.timeout(10_000);

  // diagnostics take some time to appear; the language server must be started and respond to file open event
  const DIAGNOSTICS_DELAY = 4_000;

  const SCHEMA_INSTANCE_NAME = 'references-schema.yaml';

  let schemaInstanceUri: URI;

  this.beforeAll(async function () {
    const workspaceUri = vscode.workspace.workspaceFolders[0].uri;
    schemaInstanceUri = workspaceUri.with({ path: workspaceUri.path + (workspaceUri.path.endsWith('/') ? '' : '/') + SCHEMA_INSTANCE_NAME });
  });

  test('instance has right diagnostics', async function () {
    const textDocument = await vscode.workspace.openTextDocument(schemaInstanceUri);
    await vscode.window.showTextDocument(textDocument);
    await new Promise((resolve) => setTimeout(resolve, DIAGNOSTICS_DELAY));
    const diagnostics = vscode.languages.getDiagnostics(schemaInstanceUri);

    assert.strictEqual(diagnostics.length, 1);
    assert.strictEqual(diagnostics[0].message, 'Value is below the minimum of 0.');
  });
});
