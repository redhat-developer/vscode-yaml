/*---------------------------------------------------------------------------------------------
 *  Copyright (c) IBM Corp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ConfigurationTarget, extensions, workspace } from 'vscode';
import type { ExtensionContext, WorkspaceConfiguration } from 'vscode';

interface AutoDisableSchemaDetectionEntry {
  extensionId: string;
  configurationKey?: string;
  fileMatches: string[];
}

const autoDisableSchemaDetectionEntries: AutoDisableSchemaDetectionEntry[] = [
  {
    extensionId: 'dbtlabsinc.dbt',
    fileMatches: ['**/dbt_project.yml', '**/dbt_project.yaml'],
  },
  {
    extensionId: 'docker.docker',
    configurationKey: 'docker.extension.enableComposeLanguageServer',
    fileMatches: [
      '**/docker-compose.yml',
      '**/docker-compose.yaml',
      '**/docker-compose.*.yml',
      '**/docker-compose.*.yaml',
      '**/compose.yml',
      '**/compose.yaml',
      '**/compose.*.yml',
      '**/compose.*.yaml',
    ],
  },
  {
    extensionId: 'github.vscode-github-actions',
    fileMatches: [
      '**/.github/workflows/*.yml',
      '**/.github/workflows/*.yaml',
      '**/.gitea/workflows/*.yml',
      '**/.gitea/workflows/*.yaml',
      '**/.forgejo/workflows/*.yml',
      '**/.forgejo/workflows/*.yaml',
    ],
  },
  {
    extensionId: 'ms-azure-devops.azure-pipelines',
    fileMatches: ['azure-pipelines.yml', 'azure-pipelines.yaml'],
  },
];

export async function initializeAutoDisableSchemaDetection(context: ExtensionContext): Promise<void> {
  await updateAutoDisableSchemaDetectionSetting();
  context.subscriptions.push(
    extensions.onDidChange(() => {
      updateAutoDisableSchemaDetectionSetting();
    }),
    workspace.onDidChangeConfiguration((event) => {
      if (
        event.affectsConfiguration('docker.extension.enableComposeLanguageServer') ||
        event.affectsConfiguration('yaml.disableSchemaDetection')
      ) {
        updateAutoDisableSchemaDetectionSetting();
      }
    })
  );
}

async function updateAutoDisableSchemaDetectionSetting(): Promise<void> {
  const configuration = workspace.getConfiguration('yaml');
  const currentDisableSchemaDetection = getDisableSchemaDetectionSetting(configuration);
  const update = computeAutoDisableSchemaDetectionUpdate(
    currentDisableSchemaDetection.value,
    getAutoDisabledSchemaDetectionExtensions()
  );
  if (
    !(
      currentDisableSchemaDetection.value.length === update.length &&
      currentDisableSchemaDetection.value.every((value, index) => value === update[index])
    )
  ) {
    await configuration.update('disableSchemaDetection', update, currentDisableSchemaDetection.target);
  }
}

function getDisableSchemaDetectionSetting(
  configuration: WorkspaceConfiguration
): {
  value: string[];
  target: ConfigurationTarget;
} {
  const inspected = configuration.inspect<string | string[]>('disableSchemaDetection');
  if (inspected?.workspaceValue !== undefined) {
    return {
      value: toStringArray(inspected.workspaceValue),
      target: ConfigurationTarget.Workspace,
    };
  }
  return {
    value: toStringArray(inspected?.globalValue ?? []),
    target: ConfigurationTarget.Global,
  };
}

export function getAutoDisabledSchemaDetectionExtensions(): string[] {
  const configuration = workspace.getConfiguration();
  const enabledExtensions: string[] = [];
  for (const entry of autoDisableSchemaDetectionEntries) {
    if (
      !extensions.getExtension(entry.extensionId) ||
      (entry.configurationKey && configuration.get<boolean>(entry.configurationKey, true) === false)
    ) {
      continue;
    }
    enabledExtensions.push(entry.extensionId);
  }
  return enabledExtensions;
}

export function computeAutoDisableSchemaDetectionUpdate(
  currentDisableSchemaDetection: string[],
  enabledExtensions: string[]
): string[] {
  const desiredFileMatches = getFileMatchesForExtensions(enabledExtensions);
  const disabledExtensions = autoDisableSchemaDetectionEntries
    .map((entry) => entry.extensionId)
    .filter((extensionId) => !enabledExtensions.includes(extensionId));
  const disabledFileMatches = getFileMatchesForExtensions(disabledExtensions);
  const withoutInactiveManagedFileMatches = currentDisableSchemaDetection.filter(
    (fileMatch) => !disabledFileMatches.includes(fileMatch) || desiredFileMatches.includes(fileMatch)
  );
  const additions = desiredFileMatches.filter((fileMatch) => !withoutInactiveManagedFileMatches.includes(fileMatch));
  return withoutInactiveManagedFileMatches.concat(additions);
}

function getFileMatchesForExtensions(extensionIds: string[]): string[] {
  const fileMatches: string[] = [];
  for (const entry of autoDisableSchemaDetectionEntries) {
    if (extensionIds.includes(entry.extensionId)) {
      fileMatches.push(...entry.fileMatches);
    }
  }
  return fileMatches;
}

function toStringArray(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
}
