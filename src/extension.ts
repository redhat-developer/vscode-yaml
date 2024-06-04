/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Adam Voss. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import { workspace, ExtensionContext, extensions, window, commands, Uri } from 'vscode';
import {
  CommonLanguageClient,
  LanguageClientOptions,
  NotificationType,
  RequestType,
  RevealOutputChannelOn,
} from 'vscode-languageclient';
import { CUSTOM_SCHEMA_REQUEST, CUSTOM_CONTENT_REQUEST, SchemaExtensionAPI } from './schema-extension-api';
import { joinPath } from './paths';
import { getJsonSchemaContent, IJSONSchemaCache, JSONSchemaDocumentContentProvider } from './json-schema-content-provider';
import { getConflictingExtensions, showUninstallConflictsNotification } from './extensionConflicts';
import { TelemetryErrorHandler, TelemetryOutputChannel } from './telemetry';
import { TextDecoder } from 'util';
import { createJSONSchemaStatusBarItem } from './schema-status-bar-item';
import { initializeRecommendation } from './recommendation';

export interface ISchemaAssociations {
  [pattern: string]: string[];
}

export interface ISchemaAssociation {
  fileMatch: string[];
  uri: string;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace SettingIds {
  export const maxItemsComputed = 'yaml.maxItemsComputed';
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace StorageIds {
  export const maxItemsExceededInformation = 'yaml.maxItemsExceededInformation';
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace SchemaAssociationNotification {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const type: NotificationType<ISchemaAssociations | ISchemaAssociation[]> = new NotificationType(
    'json/schemaAssociations'
  );
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace VSCodeContentRequestRegistration {
  // eslint-disable-next-line @typescript-eslint/ban-types
  export const type: NotificationType<{}> = new NotificationType('yaml/registerContentRequest');
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace VSCodeContentRequest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const type: RequestType<string, string, any> = new RequestType('vscode/content');
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace FSReadFile {
  // eslint-disable-next-line @typescript-eslint/ban-types
  export const type: RequestType<string, string, {}> = new RequestType('fs/readFile');
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace DynamicCustomSchemaRequestRegistration {
  // eslint-disable-next-line @typescript-eslint/ban-types
  export const type: NotificationType<{}> = new NotificationType('yaml/registerCustomSchemaRequest');
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace ResultLimitReachedNotification {
  // eslint-disable-next-line @typescript-eslint/ban-types
  export const type: NotificationType<string> = new NotificationType('yaml/resultLimitReached');
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace SchemaSelectionRequests {
  export const type: NotificationType<void> = new NotificationType('yaml/supportSchemaSelection');
  export const schemaStoreInitialized: NotificationType<void> = new NotificationType('yaml/schema/store/initialized');
}

let client: CommonLanguageClient;

const lsName = 'YAML Support';

export type LanguageClientConstructor = (
  name: string,
  description: string,
  clientOptions: LanguageClientOptions
) => CommonLanguageClient;

export interface RuntimeEnvironment {
  readonly telemetry: TelemetryService;
  readonly schemaCache: IJSONSchemaCache;
}

export interface TelemetryService {
  send(arg: { name: string; properties?: unknown }): Promise<void>;
  sendStartupEvent(): Promise<void>;
}

export function startClient(
  context: ExtensionContext,
  newLanguageClient: LanguageClientConstructor,
  runtime: RuntimeEnvironment
): SchemaExtensionAPI {
  const telemetryErrorHandler = new TelemetryErrorHandler(runtime.telemetry, lsName, 4);
  const outputChannel = window.createOutputChannel(lsName);
  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for on disk and newly created YAML documents
    documentSelector: [{ language: 'yaml' }, { language: 'dockercompose' }, { pattern: '*.y(a)ml' }],
    synchronize: {
      // Notify the server about file changes to YAML and JSON files contained in the workspace
      fileEvents: [workspace.createFileSystemWatcher('**/*.?(e)y?(a)ml'), workspace.createFileSystemWatcher('**/*.json')],
    },
    revealOutputChannelOn: RevealOutputChannelOn.Never,
    errorHandler: telemetryErrorHandler,
    outputChannel: new TelemetryOutputChannel(outputChannel, runtime.telemetry),
  };

  // Create the language client and start it
  client = newLanguageClient('yaml', lsName, clientOptions);

  const disposable = client.start();

  const schemaExtensionAPI = new SchemaExtensionAPI(client);

  // Push the disposable to the context's subscriptions so that the
  // client can be deactivated on extension deactivation
  context.subscriptions.push(disposable);
  context.subscriptions.push(
    workspace.registerTextDocumentContentProvider(
      'json-schema',
      new JSONSchemaDocumentContentProvider(runtime.schemaCache, schemaExtensionAPI)
    )
  );

  context.subscriptions.push(
    client.onTelemetry((e) => {
      runtime.telemetry.send(e);
    })
  );

  findConflicts();
  client
    .onReady()
    .then(() => {
      // Send a notification to the server with any YAML schema associations in all extensions
      client.sendNotification(SchemaAssociationNotification.type, getSchemaAssociations());

      // If the extensions change, fire this notification again to pick up on any association changes
      extensions.onDidChange(() => {
        client.sendNotification(SchemaAssociationNotification.type, getSchemaAssociations());
        findConflicts();
      });
      // Tell the server that the client is ready to provide custom schema content
      client.sendNotification(DynamicCustomSchemaRequestRegistration.type);
      // Tell the server that the client supports schema requests sent directly to it
      client.sendNotification(VSCodeContentRequestRegistration.type);
      // Tell the server that the client supports schema selection requests
      client.sendNotification(SchemaSelectionRequests.type);
      // If the server asks for custom schema content, get it and send it back
      client.onRequest(CUSTOM_SCHEMA_REQUEST, (resource: string) => {
        return schemaExtensionAPI.requestCustomSchema(resource);
      });
      client.onRequest(CUSTOM_CONTENT_REQUEST, (uri: string) => {
        return schemaExtensionAPI.requestCustomSchemaContent(uri);
      });
      client.onRequest(VSCodeContentRequest.type, (uri: string) => {
        return getJsonSchemaContent(uri, runtime.schemaCache);
      });
      client.onRequest(FSReadFile.type, (fsPath: string) => {
        return workspace.fs.readFile(Uri.file(fsPath)).then((uint8array) => new TextDecoder().decode(uint8array));
      });

      sendStartupTelemetryEvent(runtime.telemetry, true);
      // Adapted from:
      // https://github.com/microsoft/vscode/blob/94c9ea46838a9a619aeafb7e8afd1170c967bb55/extensions/json-language-features/client/src/jsonClient.ts#L305-L318
      client.onNotification(ResultLimitReachedNotification.type, async (message) => {
        const shouldPrompt = context.globalState.get<boolean>(StorageIds.maxItemsExceededInformation) !== false;
        if (shouldPrompt) {
          const ok = 'Ok';
          const openSettings = 'Open Settings';
          const neverAgain = "Don't Show Again";
          const pick = await window.showInformationMessage(
            `${message}\nUse setting '${SettingIds.maxItemsComputed}' to configure the limit.`,
            ok,
            openSettings,
            neverAgain
          );
          if (pick === neverAgain) {
            await context.globalState.update(StorageIds.maxItemsExceededInformation, false);
          } else if (pick === openSettings) {
            await commands.executeCommand('workbench.action.openSettings', SettingIds.maxItemsComputed);
          }
        }
      });

      client.onNotification(SchemaSelectionRequests.schemaStoreInitialized, () => {
        createJSONSchemaStatusBarItem(context, client);
      });

      initializeRecommendation(context);
    })
    .catch((err) => {
      sendStartupTelemetryEvent(runtime.telemetry, false, err);
    });

  return schemaExtensionAPI;
}

/**
 * Finds extensions that conflict with VSCode-YAML.
 * If one or more conflicts are found then show an uninstall notification
 * If no conflicts are found then do nothing
 */
function findConflicts(): void {
  const conflictingExtensions = getConflictingExtensions();
  if (conflictingExtensions.length > 0) {
    showUninstallConflictsNotification(conflictingExtensions);
  }
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

async function sendStartupTelemetryEvent(telemetry: TelemetryService, initialized: boolean, err?: Error): Promise<void> {
  const startUpEvent = {
    name: 'startup',
    properties: {
      'yaml.server.initialized': initialized,
    },
  };
  if (err?.message) {
    startUpEvent.properties['error'] = err.message;
  }
  await telemetry.send(startUpEvent);
}

export function logToExtensionOutputChannel(message: string): void {
  client.outputChannel.appendLine(message);
}
