/* eslint-disable @typescript-eslint/explicit-function-return-type */
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExtensionContext } from 'vscode';
import { LanguageClientOptions } from 'vscode-languageclient';
import { startClient, LanguageClientConstructor, RuntimeEnvironment } from '../extension';
import { LanguageClient } from 'vscode-languageclient/browser';
import { SchemaExtensionAPI } from '../schema-extension-api';
import { IJSONSchemaCache } from '../json-schema-content-provider';

// this method is called when vs code is activated
export async function activate(context: ExtensionContext): Promise<SchemaExtensionAPI> {
  const extensionUri = context.extensionUri;
  const serverMain = extensionUri.with({
    path: extensionUri.path + '/dist/languageserver-web.js',
  });
  try {
    const worker = new Worker(serverMain.toString());
    const newLanguageClient: LanguageClientConstructor = (id: string, name: string, clientOptions: LanguageClientOptions) => {
      return new LanguageClient(id, name, clientOptions, worker);
    };

    const schemaCache: IJSONSchemaCache = {
      getETag: () => undefined,
      getSchema: () => undefined,
      putSchema: () => Promise.resolve(),
    };

    const runtime: RuntimeEnvironment = {
      telemetry: { send: () => undefined, sendStartupEvent: () => undefined },
      schemaCache,
    };
    return startClient(context, newLanguageClient, runtime);
  } catch (e) {
    console.log(e);
  }
}
