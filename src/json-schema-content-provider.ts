/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TextDocumentContentProvider, Uri, ProviderResult, workspace } from 'vscode';
import { xhr, configure as configureHttpRequests, getErrorStatusDescription, XHRResponse } from 'request-light';

export class JSONSchemaDocumentContentProvider implements TextDocumentContentProvider {
  provideTextDocumentContent(uri: Uri): ProviderResult<string> {
    return getJsonSchemaContent(uri.toString().replace('json-schema://', 'https://'));
  }
}

export function getJsonSchemaContent(uri: string): Promise<string> {
  const httpSettings = workspace.getConfiguration('http');
  configureHttpRequests(httpSettings.http && httpSettings.http.proxy, httpSettings.http && httpSettings.http.proxyStrictSSL);

  const headers = { 'Accept-Encoding': 'gzip, deflate' };
  return xhr({ url: uri, followRedirects: 5, headers }).then(
    (response) => {
      return response.responseText;
    },
    (error: XHRResponse) => {
      return Promise.reject(error.responseText || getErrorStatusDescription(error.status) || error.toString());
    }
  );
}
