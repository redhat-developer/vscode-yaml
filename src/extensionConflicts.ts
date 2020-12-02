/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved..
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { commands, Extension, extensions, window } from 'vscode';

// A set of VSCode extension ID's that conflict with VSCode-YAML
const conflictingIDs = new Set(['vscoss.vscode-ansible', 'ms-vscode-deploy-azure.azure-deploy']);

/**
 * Get all of the installed extensions that currently conflict with VSCode-YAML
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getConflictingExtensions(): Extension<any>[] {
  const conflictingExtensions = [];
  conflictingIDs.forEach((extension) => {
    const ext = extensions.getExtension(extension);
    if (ext) {
      conflictingExtensions.push(ext);
    }
  });
  return conflictingExtensions;
}

/**
 * Display the uninstall conflicting extension notification if there are any conflicting extensions currently installed
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function showUninstallConflictsNotification(conflictingExts: Extension<any>[]): void {
  const uninstallMsg = 'Uninstall';

  // Gather all the conflicting display names
  let conflictMsg = '';
  if (conflictingExts.length === 1) {
    conflictMsg = `${conflictingExts[0].packageJSON.displayName} extension is incompatible with VSCode-YAML. Please uninstall it.`;
  } else {
    const extNames = [];
    conflictingExts.forEach((ext) => {
      extNames.push(ext.packageJSON.displayName);
    });
    conflictMsg = `The ${extNames.join(', ')} extensions are incompatible with VSCode-YAML. Please uninstall them.`;
  }

  window.showInformationMessage(conflictMsg, uninstallMsg).then((clickedMsg) => {
    if (clickedMsg === uninstallMsg) {
      conflictingExts.forEach((ext) => {
        commands.executeCommand('workbench.extensions.uninstallExtension', ext.id);
      });
    }
  });
}
