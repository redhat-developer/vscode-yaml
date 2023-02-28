/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import { HandlerImpl } from './handlerImpl';
import { initialize as initDependencyAnalytics } from './dependencyAnalytics';

export function initialize(context: vscode.ExtensionContext): void {
  const handler = new HandlerImpl(context);
  initDependencyAnalytics(context, handler);
}
