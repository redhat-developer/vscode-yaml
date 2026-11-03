/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { getDocUri, activate } from './helper';
import * as assert from 'assert';
import * as http from 'http';
import { getJsonSchemaContent } from '../src/json-schema-content-provider';
import type { IJSONSchemaCache } from '../src/json-schema-content-provider';
import type { AddressInfo } from 'net';

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

describe('JSON Schema HTTP error cache fallback', () => {
  let server: http.Server;
  let uri: string;

  beforeEach(async () => {
    server = http.createServer((_request, response) => {
      response.writeHead(404, { 'Content-Type': 'text/plain' });
      response.end('Schema no longer exists');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address() as AddressInfo;
    uri = `http://127.0.0.1:${address.port}/schema.json`;
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  function cache(content: string | undefined): IJSONSchemaCache {
    return {
      getETag: () => 'previous-etag',
      putSchema: async () => {},
      getSchema: async () => content,
    };
  }

  it('rejects the HTTP error when the cached file is missing', async () => {
    await assert.rejects(getJsonSchemaContent(uri, cache(undefined)), {
      code: 404,
      message: 'Schema no longer exists',
    });
  });

  it('rejects an HTTP error without a cached ETag', async () => {
    const schemaCache = cache(undefined);
    schemaCache.getETag = () => undefined;
    await assert.rejects(getJsonSchemaContent(uri, schemaCache), { code: 404 });
  });

  it('preserves existing empty cache content', async () => {
    assert.strictEqual(await getJsonSchemaContent(uri, cache('')), '');
  });

  it('returns an available cached schema after an HTTP error', async () => {
    assert.strictEqual(await getJsonSchemaContent(uri, cache('{"type":"object"}')), '{"type":"object"}');
  });
});
