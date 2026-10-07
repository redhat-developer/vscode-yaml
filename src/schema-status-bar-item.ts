/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import {
  ConfigurationTarget,
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
import { BaseLanguageClient, RequestType } from 'vscode-languageclient';

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

const schemaDeclarationPattern = /(?:#\s*(?:yaml-language-server\s*:\s*)?\$schema\s*(?:=|:)|^[ \t]*["']?\$schema["']?\s*:)/m;

export let statusBarItem: StatusBarItem;

let client: BaseLanguageClient;

const noSchemaLabel = 'No JSON Schema';
const selectSchemaVersionButton = {
  iconPath: new ThemeIcon('versions'),
  tooltip: 'Select schema version',
};

export function createJSONSchemaStatusBarItem(context: ExtensionContext, languageclient: BaseLanguageClient): void {
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
        event.contentChanges?.some((change) => {
          if (schemaDeclarationPattern.test(change.text)) {
            return true;
          }
          const changedLine = event.document.lineAt(change.range.start.line).text;
          return schemaDeclarationPattern.test(changedLine);
        })
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
      const schemaUrls = schemasPick.selectedItems.flatMap((item) => (item.schema ? [item.schema.uri] : []));
      const previouslyUsedUris = schemas.filter((s) => s.usedForCurrentFile).map((s) => s.uri);
      const deselectedUris = previouslyUsedUris.filter((uri) => !schemaUrls.includes(uri));
      await writeSchemaUriMappings(schemaUrls, fileUri, deselectedUris);
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

function removeFilePatternFromSetting(setting: unknown, filePatterns: string[]): string | string[] {
  if (Array.isArray(setting)) {
    return setting.filter((value): value is string => typeof value === 'string' && !filePatterns.includes(value));
  }

  if (typeof setting === 'string' && filePatterns.includes(setting)) {
    return [];
  }

  return typeof setting === 'string' ? setting : [];
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

async function writeSchemaUriMappings(schemaUrls: string[], fileUri: string, deselectedSchemaUris: string[] = []): Promise<void> {
  const yamlConfiguration = workspace.getConfiguration('yaml');
  const filePatterns = getFilePatternCandidates(fileUri);

  if (schemaUrls.length > 0) {
    // Clean up disableSchemaDetection from each scope individually
    const disableInspect = yamlConfiguration.inspect<string | string[]>('disableSchemaDetection');
    if (disableInspect?.globalValue !== undefined) {
      await yamlConfiguration.update(
        'disableSchemaDetection',
        removeFilePatternFromSetting(disableInspect.globalValue, filePatterns),
        ConfigurationTarget.Global
      );
    }
    if (disableInspect?.workspaceValue !== undefined) {
      await yamlConfiguration.update(
        'disableSchemaDetection',
        removeFilePatternFromSetting(disableInspect.workspaceValue, filePatterns),
        ConfigurationTarget.Workspace
      );
    }
    if (disableInspect?.workspaceFolderValue !== undefined) {
      await yamlConfiguration.update(
        'disableSchemaDetection',
        removeFilePatternFromSetting(disableInspect.workspaceFolderValue, filePatterns),
        ConfigurationTarget.WorkspaceFolder
      );
    }
  }

  const allSettingsSchemas: Record<string, string | string[]> = yamlConfiguration.get('schemas') ?? {};
  function resolveSettingsKey(schemaUri: string): string {
    if (Object.hasOwn(allSettingsSchemas, schemaUri)) return schemaUri;
    for (const candidate of getFilePatternCandidates(schemaUri)) {
      if (Object.hasOwn(allSettingsSchemas, candidate)) return candidate;
    }
    return schemaUri;
  }

  const schemasInspect = yamlConfiguration.inspect<Record<string, unknown>>('schemas');
  const negationPatterns = new Set(filePatterns.map((p) => '!' + p));
  const deselectedSchemas = new Set(deselectedSchemaUris.map(resolveSettingsKey));
  const selectedSchemas = new Set(schemaUrls.map(resolveSettingsKey));
  const selectedHandled = new Set<string>();
  const scopes: { value: Record<string, unknown> | undefined; target: ConfigurationTarget }[] = [
    { value: schemasInspect?.globalValue, target: ConfigurationTarget.Global },
    { value: schemasInspect?.workspaceValue, target: ConfigurationTarget.Workspace },
    { value: schemasInspect?.workspaceFolderValue, target: ConfigurationTarget.WorkspaceFolder },
  ];

  for (const scope of scopes) {
    if (!scope.value) continue;
    const settings = Object.assign({}, scope.value);
    let modified = false;

    for (const schemaUri of Object.keys(settings)) {
      const value = settings[schemaUri];
      const normalizedValue: string[] = Array.isArray(value) ? value : [value];

      if (deselectedSchemas.has(schemaUri)) {
        // Add negation
        const filtered = normalizedValue.filter((v) => !filePatterns.includes(v));
        if (filtered.some((p) => !p.startsWith('!'))) {
          filtered.push('!' + Uri.parse(fileUri));
          settings[schemaUri] = filtered;
        } else {
          delete settings[schemaUri];
        }
        modified = true;
      } else if (selectedSchemas.has(schemaUri)) {
        // Remove any negation for this file
        const filtered = normalizedValue.filter((v) => !negationPatterns.has(v));
        if (filtered.length !== normalizedValue.length) {
          settings[schemaUri] = filtered.length === 1 ? filtered[0] : filtered;
          modified = true;
        }
        selectedHandled.add(schemaUri);
      }
    }

    if (modified) {
      await yamlConfiguration.update('schemas', settings, scope.target);
    }
  }

  // For selected schemas not found in any scope, add to fallback scope.
  const unhandled = schemaUrls.filter((url) => !selectedHandled.has(resolveSettingsKey(url)));
  if (unhandled.length > 0) {
    const hasWorkspace = (workspace.workspaceFolders?.length ?? 0) > 0;
    const fallbackTarget = hasWorkspace ? ConfigurationTarget.Workspace : ConfigurationTarget.Global;
    const settings: Record<string, unknown> = Object.assign(
      {},
      (hasWorkspace ? schemasInspect?.workspaceValue : schemasInspect?.globalValue) ?? {}
    );
    for (const schemaUrl of unhandled) {
      settings[resolveSettingsKey(schemaUrl)] = fileUri;
    }
    await yamlConfiguration.update('schemas', settings, fallbackTarget);
  }
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
