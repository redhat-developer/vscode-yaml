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
  Uri,
} from 'vscode';
import { CommonLanguageClient, RequestType } from 'vscode-languageclient/node';

type FileUri = string;
type SchemaVersions = { [version: string]: string };
interface JSONSchema {
  name?: string;
  description?: string;
  uri: string;
  versions?: SchemaVersions;
}

interface MatchingJSONSchema extends JSONSchema {
  usedForCurrentFile: boolean;
  fromStore: boolean;
}

interface SchemaItem extends QuickPickItem {
  schema?: MatchingJSONSchema;
  disableSchemaDetection?: boolean;
}

interface SchemaVersionItem extends QuickPickItem {
  version: string;
  url: string;
}

// eslint-disable-next-line @typescript-eslint/ban-types
const getJSONSchemasRequestType: RequestType<FileUri, MatchingJSONSchema[], {}> = new RequestType('yaml/get/all/jsonSchemas');

// eslint-disable-next-line @typescript-eslint/ban-types
const getSchemaRequestType: RequestType<FileUri, JSONSchema[], {}> = new RequestType('yaml/get/jsonSchema');

export let statusBarItem: StatusBarItem;

let client: CommonLanguageClient;
let versionSelection: SchemaItem = undefined;

const selectVersionLabel = 'Select Different Version';
const noSchemaLabel = 'No JSON Schema';

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
    versionSelection = undefined;
    const fileUri = editor.document.uri.toString();
    // get schema info there
    const schema = await client.sendRequest(getSchemaRequestType, fileUri);
    if (!schema || schema.length === 0) {
      statusBarItem.text = noSchemaLabel;
      statusBarItem.tooltip = 'Select JSON Schema';
      statusBarItem.backgroundColor = undefined;
    } else if (schema.length === 1) {
      statusBarItem.text = schema[0].name ?? schema[0].uri;
      let version;
      if (schema[0].versions) {
        version = findUsedVersion(schema[0].versions, schema[0].uri);
      } else {
        const schemas = await client.sendRequest(getJSONSchemasRequestType, fileUri);
        let versionSchema: JSONSchema;
        const schemaStoreItem = findSchemaStoreItem(schemas, schema[0].uri);
        if (schemaStoreItem) {
          [version, versionSchema] = schemaStoreItem;
          (versionSchema as MatchingJSONSchema).usedForCurrentFile = true;
          versionSchema.uri = schema[0].uri;
          versionSelection = createSelectVersionItem(version, versionSchema as MatchingJSONSchema);
        }
      }
      if (version && !statusBarItem.text.includes(version)) {
        statusBarItem.text += `(${version})`;
      }
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
  const fileUri = window.activeTextEditor.document.uri.toString();
  const schemas = await client.sendRequest(getJSONSchemasRequestType, fileUri);
  const schemasPick = window.createQuickPick<SchemaItem>();
  let pickItems: SchemaItem[] = [];

  for (const val of schemas) {
    if (val.usedForCurrentFile && val.versions) {
      const item = createSelectVersionItem(findUsedVersion(val.versions, val.uri), val);
      pickItems.unshift(item);
    }
    const item = {
      label: val.name ?? val.uri,
      description: val.description,
      detail: val.usedForCurrentFile ? 'Used for current file$(check)' : '',
      alwaysShow: val.usedForCurrentFile,
      schema: val,
    };
    pickItems.push(item);
  }
  if (versionSelection) {
    pickItems.unshift(versionSelection);
  }

  pickItems = pickItems.sort((a, b) => {
    if (a.schema?.usedForCurrentFile && a.schema?.versions) {
      return -1;
    }
    if (b.schema?.usedForCurrentFile && b.schema?.versions) {
      return 1;
    }
    if (a.schema?.usedForCurrentFile) {
      return -1;
    }
    if (b.schema?.usedForCurrentFile) {
      return 1;
    }
    return a.label.localeCompare(b.label);
  });

  pickItems.unshift({
    label: noSchemaLabel,
    alwaysShow: true,
    disableSchemaDetection: true,
  });

  schemasPick.items = pickItems;
  schemasPick.placeholder = 'Search JSON schema';
  schemasPick.title = 'Select JSON schema';
  schemasPick.onDidHide(() => schemasPick.dispose());

  schemasPick.onDidChangeSelection((selection) => {
    try {
      if (selection.length > 0) {
        if (selection[0].label === selectVersionLabel) {
          handleSchemaVersionSelection(selection[0].schema, fileUri);
        } else if (selection[0].disableSchemaDetection) {
          writeDisableSchemaDetectionMapping(fileUri);
        } else if (selection[0].schema) {
          writeSchemaUriMapping(selection[0].schema.uri, fileUri);
        }
      }
    } catch (err) {
      console.error(err);
    }
    schemasPick.hide();
  });
  schemasPick.show();
}

function getFilePatternCandidates(fileUri: string): string[] {
  const candidates = new Set<string>([fileUri]);
  try {
    const uri = Uri.parse(fileUri);
    if (uri.fsPath) {
      candidates.add(uri.fsPath);
      candidates.add(workspace.asRelativePath(uri, false));
    }
  } catch {
    // ignore
  }
  return Array.from(candidates).filter(Boolean);
}

function deleteExistingFilePattern(settings: Record<string, unknown>, filePatterns: string[]): unknown {
  for (const key in settings) {
    if (Object.prototype.hasOwnProperty.call(settings, key)) {
      const element = settings[key];

      if (Array.isArray(element)) {
        const remainingFilePatterns = element.filter(
          (val): val is string => typeof val === 'string' && !filePatterns.includes(val)
        );
        if (remainingFilePatterns.length === 0) {
          delete settings[key];
        } else {
          settings[key] = remainingFilePatterns;
        }
      }

      if (typeof element === 'string' && filePatterns.includes(element)) {
        delete settings[key];
      }
    }
  }

  return settings;
}

function removeFilePatternFromSetting(setting: unknown, filePatterns: string[]): string | string[] {
  if (Array.isArray(setting)) {
    return setting.filter((value): value is string => typeof value === 'string' && !filePatterns.includes(value));
  }

  if (typeof setting === 'string' && filePatterns.includes(setting)) {
    return [];
  }

  return typeof setting === 'string' ? setting : [];
}

function addFilePatternToSetting(setting: unknown, fileUri: string): string | string[] {
  if (Array.isArray(setting)) {
    const filePatterns = setting.filter((value): value is string => typeof value === 'string');
    if (!filePatterns.includes(fileUri)) {
      filePatterns.push(fileUri);
    }
    return filePatterns;
  }

  if (typeof setting === 'string') {
    return setting === fileUri ? setting : [setting, fileUri];
  }

  return [fileUri];
}

function createSelectVersionItem(version: string, schema: MatchingJSONSchema): SchemaItem {
  return {
    label: selectVersionLabel,
    detail: `Current: ${version}`,
    alwaysShow: true,
    schema: schema,
  };
}
function findSchemaStoreItem(schemas: JSONSchema[], url: string): [string, JSONSchema] | undefined {
  for (const schema of schemas) {
    if (schema.versions) {
      for (const version in schema.versions) {
        if (url === schema.versions[version]) {
          return [version, schema];
        }
      }
    }
  }
}

function writeSchemaUriMapping(schemaUrl: string, fileUri: string): void {
  const yamlConfiguration = workspace.getConfiguration('yaml');
  const settings: Record<string, unknown> = yamlConfiguration.get('schemas');
  const disableSchemaDetection = yamlConfiguration.get('disableSchemaDetection');
  const filePatterns = getFilePatternCandidates(fileUri);
  yamlConfiguration.update('disableSchemaDetection', removeFilePatternFromSetting(disableSchemaDetection, filePatterns));
  const newSettings = Object.assign({}, settings);
  deleteExistingFilePattern(newSettings, filePatterns);
  const schemaSettings = newSettings[schemaUrl];
  if (schemaSettings) {
    if (Array.isArray(schemaSettings)) {
      (schemaSettings as Array<string>).push(fileUri);
    } else if (typeof schemaSettings === 'string') {
      newSettings[schemaUrl] = [schemaSettings, fileUri];
    }
  } else {
    newSettings[schemaUrl] = fileUri;
  }
  yamlConfiguration.update('schemas', newSettings);
}

function writeDisableSchemaDetectionMapping(fileUri: string): void {
  const yamlConfiguration = workspace.getConfiguration('yaml');
  const disableSchemaDetection = yamlConfiguration.get('disableSchemaDetection');
  yamlConfiguration.update('disableSchemaDetection', addFilePatternToSetting(disableSchemaDetection, fileUri));
}

function handleSchemaVersionSelection(schema: MatchingJSONSchema, fileUri: string): void {
  const versionPick = window.createQuickPick<SchemaVersionItem>();
  const versionItems: SchemaVersionItem[] = [];
  const usedVersion = findUsedVersion(schema.versions, schema.uri);
  for (const version in schema.versions) {
    versionItems.push({
      label: version + (usedVersion === version ? '$(check)' : ''),
      url: schema.versions[version],
      version: version,
    });
  }

  versionPick.items = versionItems;
  versionPick.title = `Select JSON Schema version for ${schema.name}`;
  versionPick.placeholder = 'Version';
  versionPick.onDidHide(() => versionPick.dispose());

  versionPick.onDidChangeSelection((items) => {
    if (items && items.length === 1) {
      writeSchemaUriMapping(items[0].url, fileUri);
    }
    versionPick.hide();
  });
  versionPick.show();
}

function findUsedVersion(versions: SchemaVersions, uri: string): string {
  for (const version in versions) {
    const versionUri = versions[version];
    if (versionUri === uri) {
      return version;
    }
  }
  return 'latest';
}
