/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import { HandlerImpl } from './handlerImpl';
import { initializeRecommendation as initOpenShiftToolkit } from './openShiftToolkit';

export function initializeRecommendation(context: vscode.ExtensionContext): void {
  const handler = new HandlerImpl(context);
  initOpenShiftToolkit(context, handler);
}
