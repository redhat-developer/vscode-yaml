/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { ExtensionContext } from 'vscode';
import { l10n } from 'vscode';
import type { LanguageClientOptions } from 'vscode-languageclient';
import type { LanguageClientConstructor, RuntimeEnvironment } from '../extension';
import { startClient } from '../extension';
import { LanguageClient } from 'vscode-languageclient/browser';
import type { SchemaExtensionAPI } from '../schema-extension-api';
import type { IJSONSchemaCache } from '../json-schema-content-provider';
import { getRedHatService } from '@redhat-developer/vscode-redhat-telemetry/lib/webworker';
// this method is called when vs code is activated
export async function activate(context: ExtensionContext): Promise<SchemaExtensionAPI | undefined> {
  const extensionUri = context.extensionUri;
  const serverMain = extensionUri.with({
    path: extensionUri.path + '/dist/languageserver-web.js',
  });
  try {
    const worker = new Worker(serverMain.toString());
    worker.postMessage({ l10nBundle: l10n.bundle });
    const newLanguageClient: LanguageClientConstructor = (id: string, name: string, clientOptions: LanguageClientOptions) => {
      return new LanguageClient(id, name, clientOptions, worker);
    };

    const schemaCache: IJSONSchemaCache = {
      getETag: () => undefined,
      getSchema: async () => undefined,
      putSchema: () => Promise.resolve(),
    };
    const telemetry = await (await getRedHatService(context)).getTelemetryService();
    const runtime: RuntimeEnvironment = {
      telemetry,
      schemaCache,
    };
    return startClient(context, newLanguageClient, runtime);
  } catch (e) {
    console.log(e);
  }
}
