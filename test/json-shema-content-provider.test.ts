/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { getDocUri, activate } from './helper';
import * as assert from 'assert';

describe('Tests for JSON Schema content provider', () => {
  const SCHEMA = 'myschema';
  const schemaJSON = JSON.stringify({
    type: 'object',
    properties: {
      version: {
        type: 'string',
        description: 'A stringy string string',
        enum: ['test'],
      },
    },
  });

  function onRequestSchema1URI(resource: string): string | undefined {
    if (resource.endsWith('completion.yaml') || resource.endsWith('basic.yaml')) {
      return `${SCHEMA}://schema/porter`;
    }
    return undefined;
  }

  function onRequestSchema1Content(): string | undefined {
    return schemaJSON;
  }

  it('should handle "json-schema" url', async () => {
    const docUri = getDocUri('completion/completion.yaml');
    const client = await activate(docUri);
    client._customSchemaContributors = {};
    client.registerContributor(SCHEMA, onRequestSchema1URI, onRequestSchema1Content);
    const customUri = vscode.Uri.parse(`json-schema://some/url/schema.json#${SCHEMA}://some/path/schema.json`);
    const doc = await vscode.workspace.openTextDocument(customUri);
    const editor = await vscode.window.showTextDocument(doc);
    assert.strictEqual(editor.document.getText(), JSON.stringify(JSON.parse(schemaJSON), null, 2));
    client._customSchemaContributors = {};
  });
});
