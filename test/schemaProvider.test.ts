/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import { getDocUri, activate, testCompletion, testHover, testDiagnostics, sleep } from './helper';

const SCHEMA = 'myschema';
const SCHEMA2 = 'myschema2';
const SCHEMA3 = 'myschema3';

describe('Tests for schema provider feature', () => {
  const docUri = getDocUri('completion/completion.yaml');
  const hoverUri = getDocUri('hover/basic.yaml');
  const schemaProviderUri = getDocUri('completion/schemaProvider.yaml');

  it('completion, hover, and validation work with registered contributor schema', async () => {
    const client = await activate(docUri);
    client._customSchemaContributors = {};
    client.registerContributor(SCHEMA, onRequestSchema1URI, onRequestSchema1Content);
    await testCompletion(docUri, new vscode.Position(0, 0), {
      items: [
        {
          label: 'version',
          kind: 9,
        },
      ],
    });

    await vscode.window.showTextDocument(hoverUri);
    await testHover(hoverUri, new vscode.Position(0, 3), [
      {
        contents: ['A stringy string string'],
      },
    ]);

    await sleep(2000); // Wait for the diagnostics to compute on this file
    await testDiagnostics(hoverUri, [
      {
        message: 'Value is not accepted. Valid values: "test".',
        range: new vscode.Range(new vscode.Position(0, 9), new vscode.Position(0, 14)),
        severity: 0,
      },
    ]);
  });

  it('Validation occurs automatically with registered contributor schema', async () => {
    const client = await activate(hoverUri);
    client._customSchemaContributors = {};
    client.registerContributor(SCHEMA, onRequestSchema1URI, onRequestSchema1Content);

    await sleep(2000); // Wait for the diagnostics to compute on this file
    await testDiagnostics(hoverUri, [
      {
        message: 'Value is not accepted. Valid values: "test".',
        range: new vscode.Range(new vscode.Position(0, 9), new vscode.Position(0, 14)),
        severity: 0,
      },
    ]);
  });

  it('Multiple contributors can match one file', async () => {
    const client = await activate(docUri);
    client._customSchemaContributors = {};
    client.registerContributor(SCHEMA2, onRequestSchema2URI, onRequestSchema2Content, 'apple: tastes_good');
    client.registerContributor(SCHEMA3, onRequestSchema3URI, onRequestSchema3Content);

    await testCompletion(docUri, new vscode.Position(0, 0), {
      items: [
        {
          label: 'apple',
          kind: 9,
          documentation: 'An apple',
        },
        {
          label: 'version',
          kind: 9,
          documentation: 'A stringy string string',
        },
      ],
    });
  });

  it('Multiple contributors with one label matches', async () => {
    const client = await activate(schemaProviderUri);
    client._customSchemaContributors = {};
    client.registerContributor(SCHEMA2, onRequestSchema2URI, onRequestSchema2Content, 'apple: tastes_good');
    client.registerContributor(SCHEMA3, onRequestSchema3URI, onRequestSchema3Content);

    await testCompletion(schemaProviderUri, new vscode.Position(0, 0), {
      items: [
        {
          label: 'apple',
          kind: 9,
          documentation: 'An apple',
        },
      ],
    });
  });

  it('Multiple contributors with labels but only one label matches', async () => {
    const client = await activate(schemaProviderUri);
    client._customSchemaContributors = {};
    client.registerContributor(SCHEMA2, onRequestSchema2URI, onRequestSchema2Content, 'apple: tastes_good');
    client.registerContributor(SCHEMA3, onRequestSchema3URI, onRequestSchema3Content, 'apple: bad');

    await testCompletion(schemaProviderUri, new vscode.Position(0, 0), {
      items: [
        {
          label: 'apple',
          kind: 9,
          documentation: 'An apple',
        },
      ],
    });
  });

  it('Multiple contributors with labels but no label matches', async () => {
    const client = await activate(schemaProviderUri);
    client._customSchemaContributors = {};
    client.registerContributor(SCHEMA2, onRequestSchema2URI, onRequestSchema2Content, 'apple: not_bad');
    client.registerContributor(SCHEMA3, onRequestSchema3URI, onRequestSchema3Content, 'apple: bad');

    await testCompletion(schemaProviderUri, new vscode.Position(0, 0), {
      items: [
        {
          label: 'apple',
          kind: 9,
          documentation: 'An apple',
        },
        {
          label: 'version',
          kind: 9,
          documentation: 'A stringy string string',
        },
      ],
    });
  });

  it('Multiple contributors with one throwing an error', async () => {
    const client = await activate(docUri);
    client._customSchemaContributors = {};
    client.registerContributor(SCHEMA2, onRequestSchema2URI, onRequestSchema2Content);
    client.registerContributor('schemathrowingerror', onRequestSchemaURIThrowError, onRequestSchemaContentThrowError);

    await testCompletion(docUri, new vscode.Position(0, 0), {
      items: [
        {
          label: 'apple',
          kind: 9,
          documentation: 'An apple',
        },
      ],
    });
  });
});

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

function onRequestSchemaURIThrowError(): string | undefined {
  throw new Error('test what happens when an error is thrown and not caught');
}

function onRequestSchemaContentThrowError(): string | undefined {
  throw new Error('test what happens when an error is thrown and not caught');
}

const schemaJSON2 = JSON.stringify({
  type: 'object',
  properties: {
    apple: {
      type: 'string',
      description: 'An apple',
    },
  },
});

function onRequestSchema2URI(): string | undefined {
  return `${SCHEMA2}://schema/porter`;
}

function onRequestSchema2Content(): string | undefined {
  return schemaJSON2;
}

function onRequestSchema3URI(): string | undefined {
  return `${SCHEMA3}://schema/porter`;
}

function onRequestSchema3Content(): string | undefined {
  return schemaJSON;
}
