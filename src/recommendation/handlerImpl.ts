/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as vscode from 'vscode';
import { IHandler } from './handler';

const KEY_RECOMMENDATION_USER_CHOICE_MAP = 'recommendationUserChoice';

async function installExtensionCmdHandler(extensionName: string, displayName: string): Promise<unknown> {
  return vscode.window
    .withProgress(
      { location: vscode.ProgressLocation.Notification, title: `Installing ${displayName || extensionName}...` },
      () => {
        return vscode.commands.executeCommand('workbench.extensions.installExtension', extensionName);
      }
    )
    .then(() => {
      vscode.window.showInformationMessage(`Successfully installed ${displayName || extensionName}.`);
    });
}

enum UserChoice {
  install = 'Install',
  never = 'Never',
  later = 'Later',
}

export class HandlerImpl implements IHandler {
  userChoice: () => unknown;
  storeUserChoice: (choice: unknown) => void;
  constructor(context: vscode.ExtensionContext) {
    this.userChoice = () => {
      return context.globalState.get(KEY_RECOMMENDATION_USER_CHOICE_MAP, {});
    };

    this.storeUserChoice = (choice: unknown) => {
      context.globalState.update(KEY_RECOMMENDATION_USER_CHOICE_MAP, choice);
    };
  }

  isExtensionInstalled(extName: string): boolean {
    return !!vscode.extensions.getExtension(extName);
  }

  canRecommendExtension(extName: string): boolean {
    return this.userChoice()[extName] !== UserChoice.never && !this.isExtensionInstalled(extName);
  }

  async handle(extName: string, message: string): Promise<void> {
    if (this.isExtensionInstalled(extName)) {
      return;
    }

    const choice = this.userChoice();
    if (choice[extName] === UserChoice.never) {
      return;
    }

    const actions: Array<string> = Object.values(UserChoice);
    const answer = await vscode.window.showInformationMessage(message, ...actions);
    if (answer === UserChoice.install) {
      await installExtensionCmdHandler(extName, extName);
    }

    choice[extName] = answer;
    this.storeUserChoice(choice);
  }
}
