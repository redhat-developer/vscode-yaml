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
const RECOMMENDATION_MESSAGE = `The workspace has devfile.yaml, Do you want to install [OpenShift Toolkit](${GH_ORG_URL}) extension for deploy it into cluster?`;
const YAML_RECOMMENDATIONS_SHOW = 'yaml.recommendations.show';

function isDevfileYAML(uri: vscode.Uri): boolean {
  if (fs.lstatSync(uri.fsPath).isDirectory()) {
    const devFileYamlPath = path.join(uri.fsPath, 'devfile.yaml');
    return fs.existsSync(devFileYamlPath);
  }
  return !!uri.path && uri.path.toLowerCase().endsWith('devfile.yaml');
}

export function initialize(context: vscode.ExtensionContext, handler: IHandler): void {
  const show = vscode.workspace.getConfiguration().get(YAML_RECOMMENDATIONS_SHOW);
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

  const isdevfileYAMLOpened = vscode.workspace.workspaceFolders.findIndex((workspace) => isDevfileYAML(workspace.uri)) !== -1;
  if (isdevfileYAMLOpened) {
    handler.handle(EXTENSION_NAME, RECOMMENDATION_MESSAGE);
  }
}
