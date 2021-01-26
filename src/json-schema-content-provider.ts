/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TextDocumentContentProvider, Uri, ProviderResult, workspace } from 'vscode';
import { xhr, configure as configureHttpRequests, getErrorStatusDescription, XHRResponse } from 'request-light';
import { JSONSchemaCache } from './json-schema-cache';

export class JSONSchemaDocumentContentProvider implements TextDocumentContentProvider {
  constructor(private readonly schemaCache: JSONSchemaCache) {}
  provideTextDocumentContent(uri: Uri): ProviderResult<string> {
    return getJsonSchemaContent(uri.toString().replace('json-schema://', 'https://'), this.schemaCache);
  }
}

export async function getJsonSchemaContent(uri: string, schemaCache: JSONSchemaCache): Promise<string> {
  const cachedSchema = await schemaCache.getSchema(uri);
  if (cachedSchema) {
    return cachedSchema;
  }
  const httpSettings = workspace.getConfiguration('http');
  configureHttpRequests(httpSettings.http && httpSettings.http.proxy, httpSettings.http && httpSettings.http.proxyStrictSSL);

  const headers = { 'Accept-Encoding': 'gzip, deflate' };
  return xhr({ url: uri, followRedirects: 5, headers })
    .then(async (response) => {
      await schemaCache.putSchema(uri, response.responseText);
      return response.responseText;
    })
    .then((text) => {
      return text;
    })
    .catch((error: XHRResponse) => {
      return Promise.reject(error.responseText || getErrorStatusDescription(error.status) || error.toString());
    });
}
