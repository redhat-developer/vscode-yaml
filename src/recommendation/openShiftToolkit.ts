/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { IHandler } from './handler';

const EXTENSION_NAME = 'redhat.vscode-openshift-connector';
const GH_ORG_URL = `https://github.com/redhat-developer/vscode-openshift-tools`;
const RECOMMENDATION_MESSAGE = `The workspace has a devfile.yaml. Install [OpenShift Toolkit](${GH_ORG_URL}) extension for assistance with deploying to a cluster?`;
const YAML_EXTENSION_RECOMMENDATIONS = 'yaml.extension.recommendations';

function isDevfileYAML(uri: vscode.Uri): boolean {
  try {
    if (fs.lstatSync(uri.fsPath).isDirectory()) {
      const devFileYamlPath = path.join(uri.fsPath, 'devfile.yaml');
      return fs.existsSync(devFileYamlPath);
    }
  } catch (error) {
    return false;
  }
  return !!uri.path && path.basename(uri.path).toLowerCase() === 'devfile.yaml';
}

export function initializeRecommendation(context: vscode.ExtensionContext, handler: IHandler): void {
  const show = vscode.workspace.getConfiguration().get(YAML_EXTENSION_RECOMMENDATIONS);
  if (!show) {
    return;
  }
  if (!handler.canRecommendExtension(EXTENSION_NAME)) {
    return;
  }
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((e) => {
      if (isDevfileYAML(e.uri)) {
        handler.handle(EXTENSION_NAME, RECOMMENDATION_MESSAGE);
      }
    })
  );

  const isdevfileYAMLOpened = vscode.workspace.workspaceFolders?.findIndex((workspace) => isDevfileYAML(workspace.uri)) > -1;
  if (isdevfileYAMLOpened) {
    handler.handle(EXTENSION_NAME, RECOMMENDATION_MESSAGE);
  }
}
