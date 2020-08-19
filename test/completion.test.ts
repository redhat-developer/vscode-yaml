/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import { getDocUri, activate, testCompletion, updateSettings, testCompletionNotEmpty, resetSettings } from './helper';
import * as path from 'path';

describe('Completion should work in multiple different scenarios', () => {
  const docUri = getDocUri(path.join('completion', 'completion.yaml'));
  const travisUri = getDocUri(path.join('completion', '.travis.yml'));

  afterEach(async () => {
    await resetSettings('schemas', {});
    await resetSettings('schemaStore.enable', true);
  });

  it('completion works with local schema', async () => {
    await activate(docUri);
    const schemaPath = path.join(__dirname, '..', '..', 'test', 'testFixture', 'schemas', 'basic_completion_schema.json');
    await updateSettings('schemas', {
      [vscode.Uri.file(schemaPath).toString()]: 'completion.yaml',
    });
    await testCompletion(docUri, new vscode.Position(0, 0), {
      items: [
        {
          label: 'my_key',
          kind: 9,
        },
      ],
    });
  });

  it('completion works with external schema', async () => {
    await activate(docUri);
    await updateSettings('schemas', {
      'https://gist.githubusercontent.com/JPinkney/4c4a43977932402c2a09a677f29287c3/raw/4d4f638b37ddeda84fb27e6b2cf14d3dc0793029/a.yaml':
        'completion.yaml',
    });
    await testCompletion(docUri, new vscode.Position(0, 0), {
      items: [
        {
          label: 'version',
          kind: 9,
        },
      ],
    });
  });

  it('completion works with schema store schema', async () => {
    await activate(travisUri);
    await updateSettings('schemaStore.enable', true);
    await testCompletionNotEmpty(travisUri, new vscode.Position(0, 0));
  });

  it('completion does not work with schema store disabled and no schemas set', async () => {
    await activate(travisUri);
    await updateSettings('schemaStore.enable', false);
    await testCompletion(travisUri, new vscode.Position(0, 0), {
      items: [],
    });
  });
});
