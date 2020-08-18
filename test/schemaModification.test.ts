/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import { getDocUri, activate, testCompletion, updateSettings, resetSettings } from './helper';
import { ExtensionAPI, MODIFICATION_ACTIONS } from '../src/schema-extension-api';

describe('Schema sections can be modified in memory', () => {
  const completionUri = getDocUri('completion/enum_completion.yaml');

  afterEach(async () => {
    await resetSettings('schemas', {});
    await resetSettings('schemaStore.enable', true);
  });

  it('Modified schema gets correct results', async () => {
    const extensionAPI: ExtensionAPI = await activate(completionUri);

    // Insert the original schema
    await updateSettings('schemas', {
      'https://gist.githubusercontent.com/JPinkney/00b908178a64d3a6274e2c9523b39521/raw/53042c011c089b13ef0a42b4b037ea2431bbba8d/basic_completion_schema.json':
        'enum_completion.yaml',
    });

    // Test that the schema was correctly loaded into memory
    await testCompletion(completionUri, new vscode.Position(0, 10), {
      items: [
        {
          label: 'my_value',
          kind: 11,
        },
      ],
    });

    // Modify the schema
    await extensionAPI.modifySchemaContent({
      action: MODIFICATION_ACTIONS.add,
      path: 'properties/my_key',
      key: 'enum',
      content: ['my_apple', 'my_banana', 'my_carrot'],
      schema:
        'https://gist.githubusercontent.com/JPinkney/00b908178a64d3a6274e2c9523b39521/raw/53042c011c089b13ef0a42b4b037ea2431bbba8d/basic_completion_schema.json',
    });

    await testCompletion(completionUri, new vscode.Position(0, 9), {
      items: [
        {
          label: 'my_apple',
          kind: 11,
        },
        {
          label: 'my_banana',
          kind: 11,
        },
        {
          label: 'my_carrot',
          kind: 11,
        },
      ],
    });
  });

  it('Deleted schema gets correct results', async () => {
    const extensionAPI: ExtensionAPI = await activate(completionUri);

    // Insert the original schema
    await updateSettings('schemas', {
      'https://gist.githubusercontent.com/JPinkney/ee1caa73523b8e0574b9e9b241e2991e/raw/9569ef35a76ce5165b3c1b35abe878c44e861b33/sample.json':
        'enum_completion.yaml',
    });

    // Test that the schema was correctly loaded into memory
    await testCompletion(completionUri, new vscode.Position(0, 10), {
      items: [
        {
          label: 'my_test1',
          kind: 11,
        },
        {
          label: 'my_test2',
          kind: 11,
        },
      ],
    });

    // Modify the schema
    await extensionAPI.modifySchemaContent({
      action: MODIFICATION_ACTIONS.delete,
      path: 'properties/my_key',
      schema:
        'https://gist.githubusercontent.com/JPinkney/ee1caa73523b8e0574b9e9b241e2991e/raw/9569ef35a76ce5165b3c1b35abe878c44e861b33/sample.json',
      key: 'enum',
    });

    await testCompletion(completionUri, new vscode.Position(0, 9), {
      items: [
        {
          label: 'my_test2',
          kind: 11,
        },
      ],
    });
  });
});
