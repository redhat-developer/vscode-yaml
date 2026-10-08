/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

describe('Language configuration', () => {
  for (const [content, column, expected] of [
    ['key: "hello"', 7, 'hello'],
    ["key: 'hello'", 7, 'hello'],
    ['app.name: hello-world', 2, 'app.name'],
    ['app.name: hello-world', 15, 'hello-world'],
    ['url: https://example.com/path', 14, 'https://example.com/path'],
    ['base: &my-anchor', 10, '&my-anchor'],
    ['alias: *my-anchor', 11, '*my-anchor'],
    ['key: |\n  multiline', 2, 'key'],
    ["key: don't", 6, "don't"],
    ['list: [first, second]', 9, 'first'],
    ['unicode: café', 11, 'café'],
    ['time: 12:30', 8, '12:30'],
    ['path: /usr/local/bin', 10, '/usr/local/bin'],
    ['key: "hello world"', 13, 'world'],
    ["key: 'it''s'", 7, 'it'],
    ['map: {name: "alice"}', 15, 'alice'],
    ['list: ["first", "second"]', 18, 'second'],
    ['pair: value#suffix', 9, 'value#suffix'],
    ['key: "café"', 8, 'café'],
    ['key: ""', 6, undefined],
    ['list: []', 7, undefined],
  ] as const) {
    it(`selects ${expected} without YAML delimiters in ${content}`, async () => {
      const doc = await vscode.workspace.openTextDocument({ language: 'yaml', content });
      await vscode.window.showTextDocument(doc);
      const word = doc.getWordRangeAtPosition(new vscode.Position(0, column));
      if (expected === undefined) {
        assert.strictEqual(word, undefined);
      } else {
        assert.ok(word);
        assert.strictEqual(doc.getText(word), expected);
      }
    });
  }

  it('expands selection to the word before the quoted scalar', async () => {
    const doc = await vscode.workspace.openTextDocument({ language: 'yaml', content: 'key: "hello"' });
    const editor = await vscode.window.showTextDocument(doc);
    const position = new vscode.Position(0, 7);
    editor.selection = new vscode.Selection(position, position);
    await vscode.commands.executeCommand('editor.action.smartSelect.expand');
    assert.strictEqual(doc.getText(editor.selection), 'hello');
    await vscode.commands.executeCommand('editor.action.smartSelect.expand');
    assert.ok(editor.selection.contains(new vscode.Range(0, 5, 0, 10)));
    assert.notStrictEqual(doc.getText(editor.selection), 'hello');
  });

  it('increases indentation after a key or list item with an anchor', () => {
    const configPath = path.resolve(__dirname, '..', '..', 'language-configuration.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const increaseIndentPattern = new RegExp(config.indentationRules.increaseIndentPattern);
    assert.ok(increaseIndentPattern.test('base: &base'));
    assert.ok(increaseIndentPattern.test('- &item'));
    assert.ok(increaseIndentPattern.test('second: &ref-erance'));
    assert.ok(increaseIndentPattern.test('- &item.v2'));
    assert.ok(!increaseIndentPattern.test('key: value'));
    assert.ok(!increaseIndentPattern.test('- item'));
  });
});
