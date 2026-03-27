import { assert } from 'chai';
import * as vscode from 'vscode';
import { URI } from 'vscode-uri';

suite('Smoke test suite', function () {
  this.timeout(10_000);

  // diagnostics take some time to appear; the language server must be started and respond to file open event
  const DIAGNOSTICS_DELAY = 4_000;

  const SCHEMA_INSTANCE_NAME = 'references-schema.yaml';
  const THROUGH_SETTINGS_NAME = 'references-schema-settings.yaml';
  const UNFORMATTED_NAME = 'unformatted.yaml';

  let schemaInstanceUri: URI;
  let throughSettingsUri: URI;
  let unformattedUri: URI;

  this.beforeAll(async function () {
    const workspaceUri = vscode.workspace.workspaceFolders[0].uri;
    schemaInstanceUri = workspaceUri.with({
      path: workspaceUri.path + (workspaceUri.path.endsWith('/') ? '' : '/') + SCHEMA_INSTANCE_NAME,
    });
    throughSettingsUri = workspaceUri.with({
      path: workspaceUri.path + (workspaceUri.path.endsWith('/') ? '' : '/') + THROUGH_SETTINGS_NAME,
    });
    unformattedUri = workspaceUri.with({
      path: workspaceUri.path + (workspaceUri.path.endsWith('/') ? '' : '/') + UNFORMATTED_NAME,
    });
  });

  test('instance has right diagnostics', async function () {
    const textDocument = await vscode.workspace.openTextDocument(schemaInstanceUri);
    await vscode.window.showTextDocument(textDocument);
    await new Promise((resolve) => setTimeout(resolve, DIAGNOSTICS_DELAY));
    const diagnostics = vscode.languages.getDiagnostics(schemaInstanceUri);

    assert.strictEqual(diagnostics.length, 1);
    assert.strictEqual(diagnostics[0].message, 'Value is below the minimum of 0.');
  });

  test('has right diagnostics when schema is referenced through settings', async function () {
    const textDocument = await vscode.workspace.openTextDocument(throughSettingsUri);
    await vscode.window.showTextDocument(textDocument);
    await new Promise((resolve) => setTimeout(resolve, DIAGNOSTICS_DELAY));
    const diagnostics = vscode.languages.getDiagnostics(throughSettingsUri);

    assert.strictEqual(diagnostics.length, 1);
    assert.strictEqual(diagnostics[0].message, 'Value is below the minimum of 0.');
  });

  test('has right formatting', async function () {
    const textDocument = await vscode.workspace.openTextDocument(unformattedUri);
    await vscode.window.showTextDocument(textDocument);

    // heavily borrowed from prettier's test suite
    const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
      'vscode.executeFormatDocumentProvider',
      textDocument.uri,
      { tabSize: 2, insertSpaces: true }
    );

    if (edits && edits.length > 0) {
      const workspaceEdit = new vscode.WorkspaceEdit();
      workspaceEdit.set(textDocument.uri, edits);
      await vscode.workspace.applyEdit(workspaceEdit);
    }

    const EXPECTED = `aaa:
  bbb: hjkl
`;

    assert.strictEqual(textDocument.getText(), EXPECTED);
  });
});
