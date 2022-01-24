/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  ExtensionContext,
  window,
  commands,
  StatusBarAlignment,
  TextEditor,
  StatusBarItem,
  QuickPickItem,
  ThemeColor,
  workspace,
} from 'vscode';
import { CommonLanguageClient, RequestType } from 'vscode-languageclient/node';

type FileUri = string;
interface JSONSchema {
  name?: string;
  description?: string;
  uri: string;
}

interface MatchingJSONSchema extends JSONSchema {
  usedForCurrentFile: boolean;
  fromStore: boolean;
}

interface SchemaItem extends QuickPickItem {
  schema?: MatchingJSONSchema;
}

// eslint-disable-next-line @typescript-eslint/ban-types
const getJSONSchemas: RequestType<FileUri, MatchingJSONSchema[], {}> = new RequestType('yaml/get/all/jsonSchemas');

// eslint-disable-next-line @typescript-eslint/ban-types
const getSchema: RequestType<FileUri, JSONSchema[], {}> = new RequestType('yaml/get/jsonSchema');

export let statusBarItem: StatusBarItem;

let client: CommonLanguageClient;
export function createJSONSchemaStatusBarItem(context: ExtensionContext, languageclient: CommonLanguageClient): void {
  if (statusBarItem) {
    updateStatusBar(window.activeTextEditor);
    return;
  }
  const commandId = 'yaml.select.json.schema';
  client = languageclient;
  commands.registerCommand(commandId, () => {
    return showSchemaSelection();
  });
  statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right);
  statusBarItem.command = commandId;
  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(window.onDidChangeActiveTextEditor(updateStatusBar));

  updateStatusBar(window.activeTextEditor);
}

async function updateStatusBar(editor: TextEditor): Promise<void> {
  if (editor && editor.document.languageId === 'yaml') {
    // get schema info there
    const schema = await client.sendRequest(getSchema, editor.document.uri.toString());
    if (!schema || schema.length === 0) {
      statusBarItem.text = 'No JSON Schema';
      statusBarItem.tooltip = 'Select JSON Schema';
      statusBarItem.backgroundColor = undefined;
    } else if (schema.length === 1) {
      statusBarItem.text = schema[0].name ?? schema[0].uri;
      statusBarItem.tooltip = 'Select JSON Schema';
      statusBarItem.backgroundColor = undefined;
    } else {
      statusBarItem.text = 'Multiple JSON Schemas...';
      statusBarItem.tooltip = 'Multiple JSON Schema used to validate this file, click to select one';
      statusBarItem.backgroundColor = new ThemeColor('statusBarItem.warningBackground');
    }

    statusBarItem.show();
  } else {
    statusBarItem.hide();
  }
}

async function showSchemaSelection(): Promise<void> {
  const schemas = await client.sendRequest(getJSONSchemas, window.activeTextEditor.document.uri.toString());
  const schemasPick = window.createQuickPick<SchemaItem>();
  const pickItems: SchemaItem[] = [];

  for (const val of schemas) {
    const item = {
      label: val.name ?? val.uri,
      description: val.description,
      detail: val.usedForCurrentFile ? 'Used for current file$(check)' : '',
      alwaysShow: val.usedForCurrentFile,
      schema: val,
    };
    pickItems.push(item);
  }

  pickItems.sort((a, b) => {
    if (a.schema?.usedForCurrentFile) {
      return -1;
    }
    if (b.schema?.usedForCurrentFile) {
      return 1;
    }
    return a.label.localeCompare(b.label);
  });

  schemasPick.items = pickItems;
  schemasPick.placeholder = 'Search JSON schema';
  schemasPick.title = 'Select JSON schema';
  schemasPick.onDidHide(() => schemasPick.dispose());

  schemasPick.onDidChangeSelection((selection) => {
    try {
      if (selection.length > 0) {
        if (selection[0].schema) {
          const settings: Record<string, unknown> = workspace.getConfiguration('yaml').get('schemas');
          const fileUri = window.activeTextEditor.document.uri.toString();
          const newSettings = Object.assign({}, settings);
          deleteExistingFilePattern(newSettings, fileUri);
          const schemaURI = selection[0].schema.uri;
          const schemaSettings = newSettings[schemaURI];
          if (schemaSettings) {
            if (Array.isArray(schemaSettings)) {
              (schemaSettings as Array<string>).push(fileUri);
            } else if (typeof schemaSettings === 'string') {
              newSettings[schemaURI] = [schemaSettings, fileUri];
            }
          } else {
            newSettings[schemaURI] = fileUri;
          }
          workspace.getConfiguration('yaml').update('schemas', newSettings);
        }
      }
    } catch (err) {
      console.error(err);
    }
    schemasPick.hide();
  });
  schemasPick.show();
}

function deleteExistingFilePattern(settings: Record<string, unknown>, fileUri: string): unknown {
  for (const key in settings) {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      const element = settings[key];

      if (Array.isArray(element)) {
        const filePatterns = element.filter((val) => val !== fileUri);
        settings[key] = filePatterns;
      }

      if (element === fileUri) {
        delete settings[key];
      }
    }
  }

  return settings;
}
