/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Adam Voss. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as path from 'path';

import { workspace, ExtensionContext, extensions } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind, NotificationType } from 'vscode-languageclient';
import { CUSTOM_SCHEMA_REQUEST, CUSTOM_CONTENT_REQUEST, SchemaExtensionAPI } from './schema-extension-api';
import { joinPath } from './paths';

export interface ISchemaAssociations {
  [pattern: string]: string[];
}

export interface ISchemaAssociation {
  fileMatch: string[];
  uri: string;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace SchemaAssociationNotification {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const type: NotificationType<ISchemaAssociations | ISchemaAssociation[], any> = new NotificationType(
    'json/schemaAssociations'
  );
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace DynamicCustomSchemaRequestRegistration {
  // eslint-disable-next-line @typescript-eslint/ban-types
  export const type: NotificationType<{}, {}> = new NotificationType('yaml/registerCustomSchemaRequest');
}

let client: LanguageClient;

export function activate(context: ExtensionContext): SchemaExtensionAPI {
  // The YAML language server is implemented in node
  const serverModule = context.asAbsolutePath(
    path.join('node_modules', 'yaml-language-server', 'out', 'server', 'src', 'server.js')
  );

  // The debug options for the server
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for on disk and newly created YAML documents
    documentSelector: [{ language: 'yaml' }],
    synchronize: {
      // Synchronize these setting sections with the server
      configurationSection: ['yaml', 'http.proxy', 'http.proxyStrictSSL', 'editor.tabSize', '[yaml]'],
      // Notify the server about file changes to YAML and JSON files contained in the workspace
      fileEvents: [workspace.createFileSystemWatcher('**/*.?(e)y?(a)ml'), workspace.createFileSystemWatcher('**/*.json')],
    },
  };

  // Create the language client and start it
  client = new LanguageClient('yaml', 'YAML Support', serverOptions, clientOptions);
  const disposable = client.start();

  const schemaExtensionAPI = new SchemaExtensionAPI(client);

  // Push the disposable to the context's subscriptions so that the
  // client can be deactivated on extension deactivation
  context.subscriptions.push(disposable);

  client.onReady().then(() => {
    // Send a notification to the server with any YAML schema associations in all extensions
    client.sendNotification(SchemaAssociationNotification.type, getSchemaAssociations());

    // If the extensions change, fire this notification again to pick up on any association changes
    extensions.onDidChange(() => {
      client.sendNotification(SchemaAssociationNotification.type, getSchemaAssociations());
    });
    // Tell the server that the client is ready to provide custom schema content
    client.sendNotification(DynamicCustomSchemaRequestRegistration.type);
    // If the server asks for custom schema content, get it and send it back
    client.onRequest(CUSTOM_SCHEMA_REQUEST, (resource: string) => {
      return schemaExtensionAPI.requestCustomSchema(resource);
    });
    client.onRequest(CUSTOM_CONTENT_REQUEST, (uri: string) => {
      return schemaExtensionAPI.requestCustomSchemaContent(uri);
    });
  });

  return schemaExtensionAPI;
}

function getSchemaAssociations(): ISchemaAssociation[] {
  const associations: ISchemaAssociation[] = [];
  extensions.all.forEach((extension) => {
    const packageJSON = extension.packageJSON;
    if (packageJSON && packageJSON.contributes && packageJSON.contributes.yamlValidation) {
      const yamlValidation = packageJSON.contributes.yamlValidation;
      if (Array.isArray(yamlValidation)) {
        yamlValidation.forEach((jv) => {
          // eslint-disable-next-line prefer-const
          let { fileMatch, url } = jv;
          if (typeof fileMatch === 'string') {
            fileMatch = [fileMatch];
          }
          if (Array.isArray(fileMatch) && typeof url === 'string') {
            let uri: string = url;
            if (uri[0] === '.' && uri[1] === '/') {
              uri = joinPath(extension.extensionUri, uri).toString();
            }
            fileMatch = fileMatch.map((fm) => {
              if (fm[0] === '%') {
                fm = fm.replace(/%APP_SETTINGS_HOME%/, '/User');
                fm = fm.replace(/%MACHINE_SETTINGS_HOME%/, '/Machine');
                fm = fm.replace(/%APP_WORKSPACES_HOME%/, '/Workspaces');
              } else if (!fm.match(/^(\w+:\/\/|\/|!)/)) {
                fm = '/' + fm;
              }
              return fm;
            });
            associations.push({ fileMatch, uri });
          }
        });
      }
    }
  });
  return associations;
}

export function logToExtensionOutputChannel(message: string): void {
  client.outputChannel.appendLine(message);
}
