/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat, Inc. All rights reserved.
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import * as path from 'path';
import assert = require('assert');
import { CommonLanguageClient } from 'vscode-languageclient/lib/common/commonClient';
import { MessageTransports, ProtocolRequestType, ProtocolRequestType0, RequestType, RequestType0 } from 'vscode-languageclient';

export let doc: vscode.TextDocument;
export let editor: vscode.TextEditor;
export let documentEol: string;
export let platformEol: string;

/**
 * Activates the redhat.vscode-yaml extension
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function activate(docUri: vscode.Uri): Promise<any> {
  const ext = vscode.extensions.getExtension('redhat.vscode-yaml');
  const activation = await ext.activate();
  try {
    doc = await vscode.workspace.openTextDocument(docUri);
    editor = await vscode.window.showTextDocument(doc);

    await sleep(2000); // Wait for server activation
    return activation;
  } catch (e) {
    console.error(e);
  }
}

export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const getDocPath = (p: string): string => {
  return path.resolve(__dirname, path.join('..', '..', 'test', 'testFixture', p));
};

export const getDocUri = (p: string): vscode.Uri => {
  return vscode.Uri.file(getDocPath(p));
};

export const updateSettings = (setting: string, value: unknown): Thenable<void> => {
  const yamlConfiguration = vscode.workspace.getConfiguration('yaml', null);
  return yamlConfiguration.update(setting, value, false);
};

export const resetSettings = (setting: string, value: unknown): Thenable<void> => {
  const yamlConfiguration = vscode.workspace.getConfiguration('yaml', null);
  return yamlConfiguration.update(setting, value, false);
};

export async function setTestContent(content: string): Promise<boolean> {
  const all = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
  return editor.edit((eb) => eb.replace(all, content));
}

export async function testCompletion(
  docUri: vscode.Uri,
  position: vscode.Position,
  expectedCompletionList: vscode.CompletionList
): Promise<void> {
  // Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
  const actualCompletionList = (await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    docUri,
    position
  )) as vscode.CompletionList;

  const sortedActualCompletionList = actualCompletionList.items.sort((a, b) => (a.label > b.label ? 1 : -1));
  assert.equal(
    actualCompletionList.items.length,
    expectedCompletionList.items.length,
    "Completion List doesn't have expected size"
  );
  expectedCompletionList.items
    .sort((a, b) => (a.label > b.label ? 1 : -1))
    .forEach((expectedItem, i) => {
      const actualItem = sortedActualCompletionList[i];
      assert.equal(actualItem.label, expectedItem.label);
      assert.equal(actualItem.kind, expectedItem.kind);
    });
}

export async function testCompletionNotEmpty(docUri: vscode.Uri, position: vscode.Position): Promise<void> {
  // Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
  const actualCompletionList = (await vscode.commands.executeCommand(
    'vscode.executeCompletionItemProvider',
    docUri,
    position
  )) as vscode.CompletionList;

  assert.notEqual(actualCompletionList.items.length, 0);
}

export async function testHover(docUri: vscode.Uri, position: vscode.Position, expectedHover: vscode.Hover[]): Promise<void> {
  // Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
  const actualHoverResults = (await vscode.commands.executeCommand(
    'vscode.executeHoverProvider',
    docUri,
    position
  )) as vscode.Hover[];

  assert.equal(actualHoverResults.length, expectedHover.length);
  expectedHover.forEach((expectedItem, i) => {
    const actualItem = actualHoverResults[i];
    assert.equal((actualItem.contents[i] as vscode.MarkdownString).value, expectedItem.contents[i]);
  });
}

export async function testDiagnostics(docUri: vscode.Uri, expectedDiagnostics: vscode.Diagnostic[]): Promise<void> {
  const actualDiagnostics = vscode.languages.getDiagnostics(docUri);

  assert.equal(actualDiagnostics.length, expectedDiagnostics.length);

  expectedDiagnostics.forEach((expectedDiagnostic, i) => {
    const actualDiagnostic = actualDiagnostics[i];
    assert.equal(actualDiagnostic.message, expectedDiagnostic.message);
    assert.deepEqual(actualDiagnostic.range, expectedDiagnostic.range);
    assert.equal(actualDiagnostic.severity, expectedDiagnostic.severity);
  });
}

export class TestMemento implements vscode.Memento {
  keys(): readonly string[] {
    throw new Error('Method not implemented.');
  }
  get<T>(key: string): T;
  get<T>(key: string, defaultValue: T): T;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  get<T>(key: string, defaultValue?: T): T | undefined {
    throw new Error('Method not implemented.');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(key: string, value: unknown): Thenable<void> {
    throw new Error('Method not implemented.');
  }
}

export class TestLanguageClient extends CommonLanguageClient {
  constructor() {
    super('test', 'test', {});
  }
  protected getLocale(): string {
    throw new Error('Method not implemented.');
  }
  protected createMessageTransports(): Promise<MessageTransports> {
    throw new Error('Method not implemented.');
  }

  sendRequest<R, PR, E, RO>(type: ProtocolRequestType0<R, PR, E, RO>, token?: vscode.CancellationToken): Promise<R>;
  sendRequest<P, R, PR, E, RO>(
    type: ProtocolRequestType<P, R, PR, E, RO>,
    params: P,
    token?: vscode.CancellationToken
  ): Promise<R>;
  sendRequest<R, E>(type: RequestType0<R, E>, token?: vscode.CancellationToken): Promise<R>;
  sendRequest<P, R, E>(type: RequestType<P, R, E>, params: P, token?: vscode.CancellationToken): Promise<R>;
  sendRequest<R>(method: string, token?: vscode.CancellationToken): Promise<R>;
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars*/
  sendRequest<R>(method: string, param: any, token?: vscode.CancellationToken): Promise<R>;
  sendRequest<R>(
    method: any,
    param?: any,
    token?: any
  ): Promise<R> | Promise<R> | Promise<R> | Promise<R> | Promise<R> | Promise<R> {
    return Promise.resolve(void 0);
  }
}
