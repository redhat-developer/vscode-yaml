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
  const cachedETag = schemaCache.getETag(uri);

  const httpSettings = workspace.getConfiguration('http');
  configureHttpRequests(httpSettings.http && httpSettings.http.proxy, httpSettings.http && httpSettings.http.proxyStrictSSL);

  const headers: { [key: string]: string } = { 'Accept-Encoding': 'gzip, deflate' };
  if (cachedETag) {
    headers['If-None-Match'] = cachedETag;
  }
  return xhr({ url: uri, followRedirects: 5, headers })
    .then(async (response) => {
      // cache only if server supports 'etag' header
      if (response.headers['etag']) {
        await schemaCache.putSchema(uri, response.headers['etag'], response.responseText);
      }
      return response.responseText;
    })
    .then((text) => {
      return text;
    })
    .catch((error: XHRResponse) => {
      // content not changed, return cached
      if (error.status === 304) {
        return schemaCache.getSchema(uri);
      }
      // in case of some error, like internet connection issue, check if cached version exist and return it
      if (schemaCache.getETag(uri)) {
        return schemaCache.getSchema(uri);
      }
      return Promise.reject(error.responseText || getErrorStatusDescription(error.status) || error.toString());
    });
}
