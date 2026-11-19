/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert';
import * as vscode from 'vscode';
import type { ExtensionAPI } from '../src/schema-extension-api';
import { activate, getDocUri, sleep } from './helper';

describe('Hover transformers', () => {
  const docUri = getDocUri('hover/transformer.yaml');
  const disposables: vscode.Disposable[] = [];
  let api: ExtensionAPI;

  before(async () => {
    api = await activate(docUri);
  });

  afterEach(() => {
    disposables.splice(0).forEach((disposable) => disposable.dispose());
  });

  async function hover(): Promise<string> {
    for (let attempt = 0; attempt < 40; attempt++) {
      const hovers = await vscode.commands.executeCommand<vscode.Hover[]>(
        'vscode.executeHoverProvider',
        docUri,
        new vscode.Position(1, 2)
      );
      const value = hovers
        .flatMap((result) => result.contents.map((content) => (typeof content === 'string' ? content : content.value)))
        .join('\n');
      if (value.includes('My string')) {
        return value;
      }
      await sleep(100);
    }
    assert.fail('Schema hover did not become available');
  }

  it('changes hovers in registration order until disposed', async () => {
    const original = await hover();
    disposables.push(
      api.registerHoverTransformer((current) => new vscode.Hover([...current.contents, new vscode.MarkdownString('first')])),
      api.registerHoverTransformer((current) => {
        (current.contents[current.contents.length - 1] as vscode.MarkdownString).appendMarkdown(' second');
        return undefined;
      })
    );

    assert.strictEqual(await hover(), `${original}\nfirst second`);
    disposables.splice(0).forEach((disposable) => disposable.dispose());
    assert.strictEqual(await hover(), original);
  });

  it('keeps showing hovers when a transformer fails', async () => {
    const original = await hover();
    disposables.push(
      api.registerHoverTransformer(() => {
        throw new Error('transformer failure');
      }),
      api.registerHoverTransformer(async (current) => new vscode.Hover([...current.contents, 'after']))
    );

    assert.strictEqual(await hover(), `${original}\nafter`);
  });
});
