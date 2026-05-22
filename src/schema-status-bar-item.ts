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
  ThemeIcon,
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

const noSchemaLabel = 'No JSON Schema';
const selectSchemaVersionButton = {
  iconPath: new ThemeIcon('versions'),
  tooltip: 'Select schema version',
};

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
  context.subscriptions.push(
    workspace.onDidChangeTextDocument((event) => {
      const editor = window.activeTextEditor;
      if (
        editor?.document.languageId === 'yaml' &&
        editor.document.uri.toString() === event.document.uri.toString() &&
        event.contentChanges?.some((change) => /#\s*yaml-language-server:\s*\$schema=/.test(change.text))
      ) {
        updateStatusBar(editor);
      }
    })
  );

  updateStatusBar(window.activeTextEditor);
}

async function updateStatusBar(editor: TextEditor): Promise<void> {
  if (editor && editor.document.languageId === 'yaml') {
    const fileUri = editor.document.uri.toString();
    // get schema info there
    const schema = await client.sendRequest(getSchemaRequestType, fileUri);
    if (!schema || schema.length === 0) {
      statusBarItem.text = noSchemaLabel;
      statusBarItem.tooltip = 'Select JSON Schemas';
    } else if (schema.length === 1) {
      statusBarItem.tooltip = 'Select JSON Schemas';
      statusBarItem.text = schema[0].name ?? schema[0].uri;
      let version;
      if (schema[0].versions) {
        version = findUsedVersion(schema[0].versions, schema[0].uri);
      } else {
        const schemas = await client.sendRequest(getJSONSchemasRequestType, fileUri);
        const schemaStoreItem = findSchemaStoreItem(schemas, schema[0].uri);
        if (schemaStoreItem) {
          version = schemaStoreItem[0];
        }
      }
      if (version && !statusBarItem.text.includes(version)) {
        statusBarItem.text += `(${version})`;
      }
    } else {
      statusBarItem.text = 'Multiple JSON Schemas';
      statusBarItem.tooltip = `Validated using ${schema.length} JSON schemas:\n${schema.map((s) => s.name ?? s.uri).join('\n')}`;
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
    const item = {
      label: val.name ?? val.uri,
      description: val.description,
      detail: val.usedForCurrentFile ? 'Used for current file$(check)' : '',
      alwaysShow: val.usedForCurrentFile,
      buttons: val.versions ? [selectSchemaVersionButton] : undefined,
      schema: val,
    };
    pickItems.push(item);
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

  const noSchemaItem: SchemaItem = {
    label: noSchemaLabel,
    alwaysShow: true,
    disableSchemaDetection: true,
  };
  pickItems.unshift(noSchemaItem);

  schemasPick.items = pickItems;
  schemasPick.canSelectMany = true;
  const selectedSchemaItems = pickItems.filter((item) => item.schema?.usedForCurrentFile);
  schemasPick.selectedItems =
    selectedSchemaItems.length > 0 && !isSchemaDetectionDisabled(fileUri) ? selectedSchemaItems : [noSchemaItem];
  let previousSelectedItems = schemasPick.selectedItems;
  schemasPick.placeholder = 'Search JSON schema';
  schemasPick.title = 'Select JSON schemas';
  schemasPick.onDidHide(() => schemasPick.dispose());
  schemasPick.onDidChangeSelection((items) => {
    const selectedSchemaItems = items.filter((item) => item.schema);
    const hasNoSchemaItem = items.some((item) => item.disableSchemaDetection);
    if (items.length === 0) {
      schemasPick.selectedItems = [noSchemaItem];
    } else if (hasNoSchemaItem && selectedSchemaItems.length > 0) {
      const previousHadNoSchemaItem = previousSelectedItems.some((item) => item.disableSchemaDetection);
      schemasPick.selectedItems = previousHadNoSchemaItem ? selectedSchemaItems : [noSchemaItem];
    }
    previousSelectedItems = schemasPick.selectedItems;
  });
  schemasPick.onDidTriggerItemButton((event) => {
    if (event.button === selectSchemaVersionButton && event.item.schema?.versions) {
      const selectedSchemaUris = schemasPick.selectedItems.flatMap((item) => (item.schema ? [item.schema.uri] : []));
      schemasPick.hide();
      handleSchemaVersionSelection(event.item.schema, fileUri, selectedSchemaUris);
    }
  });

  schemasPick.onDidAccept(async () => {
    try {
      if (schemasPick.selectedItems.length === 0 || schemasPick.selectedItems.some((item) => item.disableSchemaDetection)) {
        await writeDisableSchemaDetectionMapping(fileUri);
      } else {
        const schemaUrls = schemasPick.selectedItems.flatMap((item) => (item.schema ? [item.schema.uri] : []));
        if (schemaUrls.length === 0) {
          await writeDisableSchemaDetectionMapping(fileUri);
        } else {
          await writeSchemaUriMappings(schemaUrls, fileUri);
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

function isSchemaDetectionDisabled(fileUri: string): boolean {
  const disableSchemaDetection = workspace.getConfiguration('yaml').get('disableSchemaDetection');
  const filePatterns = getFilePatternCandidates(fileUri);
  if (Array.isArray(disableSchemaDetection)) {
    return disableSchemaDetection.some((value) => typeof value === 'string' && filePatterns.includes(value));
  }
  return typeof disableSchemaDetection === 'string' && filePatterns.includes(disableSchemaDetection);
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

async function writeSchemaUriMappings(schemaUrls: string[], fileUri: string): Promise<void> {
  const yamlConfiguration = workspace.getConfiguration('yaml');
  const settings: Record<string, unknown> = yamlConfiguration.get('schemas');
  const disableSchemaDetection = yamlConfiguration.get('disableSchemaDetection');
  const filePatterns = getFilePatternCandidates(fileUri);
  await yamlConfiguration.update('disableSchemaDetection', removeFilePatternFromSetting(disableSchemaDetection, filePatterns));
  const newSettings = Object.assign({}, settings);
  deleteExistingFilePattern(newSettings, filePatterns);

  for (const schemaUrl of schemaUrls) {
    const schemaSettings = newSettings[schemaUrl];
    if (schemaSettings) {
      if (Array.isArray(schemaSettings)) {
        const schemaFilePatterns = schemaSettings.filter((value): value is string => typeof value === 'string');
        if (!schemaFilePatterns.includes(fileUri)) {
          schemaFilePatterns.push(fileUri);
        }
        newSettings[schemaUrl] = schemaFilePatterns;
      } else if (typeof schemaSettings === 'string') {
        newSettings[schemaUrl] = schemaSettings === fileUri ? schemaSettings : [schemaSettings, fileUri];
      }
    } else {
      newSettings[schemaUrl] = fileUri;
    }
  }
  await yamlConfiguration.update('schemas', newSettings);
}

async function writeDisableSchemaDetectionMapping(fileUri: string): Promise<void> {
  const yamlConfiguration = workspace.getConfiguration('yaml');
  const disableSchemaDetection = yamlConfiguration.get('disableSchemaDetection');
  await yamlConfiguration.update('disableSchemaDetection', addFilePatternToSetting(disableSchemaDetection, fileUri));
}

function handleSchemaVersionSelection(schema: MatchingJSONSchema, fileUri: string, selectedSchemaUris: string[]): void {
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
  versionPick.title = `Select JSON Schema version for ${schema.name ?? schema.uri}`;
  versionPick.placeholder = 'Version';
  versionPick.onDidHide(() => versionPick.dispose());

  versionPick.onDidChangeSelection(async (items) => {
    if (items && items.length === 1) {
      const schemaVersionUris = new Set(Object.values(schema.versions ?? {}));
      const remainingSchemaUris = selectedSchemaUris.filter(
        (schemaUri) => schemaUri !== schema.uri && !schemaVersionUris.has(schemaUri)
      );
      const updatedSchemaUris = Array.from(new Set([...remainingSchemaUris, items[0].url]));
      await writeSchemaUriMappings(updatedSchemaUris, fileUri);
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
