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
    path: extensionUri.path + '/out/src/webworker/yamlServerMain.js',
  });
  try {
    const worker = createWorker(serverMain.toString(false));
    const newLanguageClient: LanguageClientConstructor = (id: string, name: string, clientOptions: LanguageClientOptions) => {
      return new LanguageClient(id, name, clientOptions, worker);
    };

    const schemaCache: IJSONSchemaCache = {
      getETag: () => undefined,
      getSchema: () => undefined,
      putSchema: () => Promise.resolve(),
    };

    const runtime: RuntimeEnvironment = {
      telemetry: { send: () => undefined },
      schemaCache,
    };
    return startClient(context, newLanguageClient, runtime);
  } catch (e) {
    console.log(e);
  }
}

// create workercross domain
// thanks to https://benohead.com/blog/2017/12/06/cross-domain-cross-browser-web-workers/

function createWorker(workerUrl: string) {
  let worker = null;
  try {
    worker = new globalThis.Worker(workerUrl);
    worker.onerror = function (event) {
      event.preventDefault();
      worker = createWorkerFallback(workerUrl);
    };
  } catch (e) {
    worker = createWorkerFallback(workerUrl);
  }
  return worker;
}

function createWorkerFallback(workerUrl) {
  let worker = null;
  try {
    let blob;
    try {
      blob = new globalThis.Blob(["importScripts('" + workerUrl + "');"], { type: 'application/javascript' });
    } catch (e) {
      const blobBuilder = new (globalThis.BlobBuilder || globalThis.WebKitBlobBuilder || globalThis.MozBlobBuilder)();
      blobBuilder.append("importScripts('" + workerUrl + "');");
      blob = blobBuilder.getBlob('application/javascript');
    }
    const url = globalThis.URL || globalThis.webkitURL;
    const blobUrl = url.createObjectURL(blob);
    worker = new globalThis.Worker(blobUrl);
  } catch (e1) {
    //if it still fails, there is nothing much we can do
  }
  return worker;
}
