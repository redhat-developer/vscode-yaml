/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TextDocumentContentProvider, Uri, workspace, window } from 'vscode';
import { xhr, configure as configureHttpRequests, getErrorStatusDescription, XHRResponse } from 'request-light';
import { JSONSchemaCache } from './json-schema-cache';
import { SchemaExtensionAPI } from './schema-extension-api';

export class JSONSchemaDocumentContentProvider implements TextDocumentContentProvider {
  constructor(private readonly schemaCache: JSONSchemaCache, private readonly schemaApi: SchemaExtensionAPI) {}
  async provideTextDocumentContent(uri: Uri): Promise<string> {
    if (uri.fragment) {
      const origUri = uri.fragment;
      const schemaUri = Uri.parse(origUri);
      // handle both 'http' and 'https'
      if (origUri.startsWith('http')) {
        return getJsonSchemaContent(origUri, this.schemaCache);
      } else if (this.schemaApi.hasProvider(schemaUri.scheme)) {
        let content = this.schemaApi.requestCustomSchemaContent(origUri);

        content = await Promise.resolve(content);
        // prettify JSON
        if (content.indexOf('\n') === -1) {
          content = JSON.stringify(JSON.parse(content), null, 2);
        }

        return content;
      } else {
        window.showErrorMessage(`Cannot Load content for: ${origUri}. Unknown schema: '${schemaUri.scheme}'`);
        return null;
      }
    } else {
      window.showErrorMessage(`Cannot Load content for: '${uri.toString()}' `);
      return null;
    }
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
    .catch(async (error: XHRResponse) => {
      // content not changed, return cached
      if (error.status === 304) {
        const content = await schemaCache.getSchema(uri);
        // ensure that we return content even if cache doesn't have it
        if (content === undefined) {
          console.error(`Cannot read cached content for: ${uri}, trying to load again`);
          delete headers['If-None-Match'];
          return xhr({ url: uri, followRedirects: 5, headers })
            .then((response) => {
              return response.responseText;
            })
            .catch((err: XHRResponse) => {
              return createReject(err);
            });
        }
        return content;
      }
      // in case of some error, like internet connection issue, check if cached version exist and return it
      if (schemaCache.getETag(uri)) {
        const content = schemaCache.getSchema(uri);
        if (content) {
          return content;
        }
      }
      return createReject(error);
    });
}

function createReject(error: XHRResponse): Promise<string> {
  return Promise.reject(error.responseText || getErrorStatusDescription(error.status) || error.toString());
}
