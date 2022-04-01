/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chai from 'chai';
import { createJSONSchemaStatusBarItem } from '../src/schema-status-bar-item';
import { CommonLanguageClient } from 'vscode-languageclient';
import * as vscode from 'vscode';
import { TestLanguageClient } from './helper';
import * as jsonStatusBar from '../src/schema-status-bar-item';

const expect = chai.expect;
chai.use(sinonChai);

describe('Status bar should work in multiple different scenarios', () => {
  const sandbox = sinon.createSandbox();
  let clcStub: sinon.SinonStubbedInstance<TestLanguageClient>;
  let registerCommandStub: sinon.SinonStub;
  let createStatusBarItemStub: sinon.SinonStub;
  let onDidChangeActiveTextEditorStub: sinon.SinonStub;

  beforeEach(() => {
    clcStub = sandbox.stub(new TestLanguageClient());
    registerCommandStub = sandbox.stub(vscode.commands, 'registerCommand');
    createStatusBarItemStub = sandbox.stub(vscode.window, 'createStatusBarItem');
    onDidChangeActiveTextEditorStub = sandbox.stub(vscode.window, 'onDidChangeActiveTextEditor');
    sandbox.stub(vscode.window, 'activeTextEditor').returns(undefined);
    sandbox.stub(jsonStatusBar, 'statusBarItem').returns(undefined);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('Should create status bar item for JSON Schema', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    createStatusBarItemStub.returns(statusBar);
    clcStub.sendRequest.resolves([]);

    createJSONSchemaStatusBarItem(context, (clcStub as unknown) as CommonLanguageClient);

    expect(registerCommandStub).calledOnceWith('yaml.select.json.schema');
    expect(createStatusBarItemStub).calledOnceWith(vscode.StatusBarAlignment.Right);
    expect(context.subscriptions).has.length(2);
  });

  it('Should update status bar on editor change', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    createStatusBarItemStub.returns(statusBar);
    onDidChangeActiveTextEditorStub.returns({});
    clcStub.sendRequest.resolves([{ uri: 'https://foo.com/bar.json', name: 'bar schema' }]);

    createJSONSchemaStatusBarItem(context, (clcStub as unknown) as CommonLanguageClient);
    const callBackFn = onDidChangeActiveTextEditorStub.firstCall.firstArg;
    await callBackFn({ document: { languageId: 'yaml', uri: vscode.Uri.parse('/foo.yaml') } });

    expect(statusBar.text).to.equal('bar schema');
    expect(statusBar.tooltip).to.equal('Select JSON Schema');
    expect(statusBar.backgroundColor).to.be.undefined;
    expect(statusBar.show).calledTwice;
  });

  it('Should inform if there are no schema', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    createStatusBarItemStub.returns(statusBar);
    onDidChangeActiveTextEditorStub.returns({});
    clcStub.sendRequest.resolves([]);

    createJSONSchemaStatusBarItem(context, (clcStub as unknown) as CommonLanguageClient);
    const callBackFn = onDidChangeActiveTextEditorStub.firstCall.firstArg;
    await callBackFn({ document: { languageId: 'yaml', uri: vscode.Uri.parse('/foo.yaml') } });

    expect(statusBar.text).to.equal('No JSON Schema');
    expect(statusBar.tooltip).to.equal('Select JSON Schema');
    expect(statusBar.backgroundColor).to.be.undefined;
    expect(statusBar.show).calledTwice;
  });

  it('Should inform if there are more than one schema', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    createStatusBarItemStub.returns(statusBar);
    onDidChangeActiveTextEditorStub.returns({});
    clcStub.sendRequest.resolves([{}, {}]);

    createJSONSchemaStatusBarItem(context, (clcStub as unknown) as CommonLanguageClient);
    const callBackFn = onDidChangeActiveTextEditorStub.firstCall.firstArg;
    await callBackFn({ document: { languageId: 'yaml', uri: vscode.Uri.parse('/foo.yaml') } });

    expect(statusBar.text).to.equal('Multiple JSON Schemas...');
    expect(statusBar.tooltip).to.equal('Multiple JSON Schema used to validate this file, click to select one');
    expect(statusBar.backgroundColor).to.eql({ id: 'statusBarItem.warningBackground' });
    expect(statusBar.show).calledTwice;
  });

  it('Should show JSON Schema Store schema version', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    createStatusBarItemStub.returns(statusBar);
    onDidChangeActiveTextEditorStub.returns({ document: { uri: vscode.Uri.parse('/foo.yaml') } });
    clcStub.sendRequest
      .withArgs(sinon.match.has('method', 'yaml/get/jsonSchema'), sinon.match('/foo.yaml'))
      .resolves([{ uri: 'https://foo.com/bar.json', name: 'bar schema' }]);
    clcStub.sendRequest
      .withArgs(sinon.match.has('method', 'yaml/get/all/jsonSchemas'), sinon.match.any)
      .resolves([{ versions: { '1.0.0': 'https://foo.com/bar.json' } }]);

    createJSONSchemaStatusBarItem(context, (clcStub as unknown) as CommonLanguageClient);
    const callBackFn = onDidChangeActiveTextEditorStub.firstCall.firstArg;
    await callBackFn({ document: { languageId: 'yaml', uri: vscode.Uri.parse('/foo.yaml') } });

    expect(statusBar.text).to.equal('bar schema(1.0.0)');
    expect(statusBar.tooltip).to.equal('Select JSON Schema');
    expect(statusBar.backgroundColor).to.be.undefined;
    expect(statusBar.show).calledTwice;
  });

  it('Should show JSON Schema Store schema version, dont include version', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    createStatusBarItemStub.returns(statusBar);
    onDidChangeActiveTextEditorStub.returns({ document: { uri: vscode.Uri.parse('/foo.yaml') } });
    clcStub.sendRequest
      .withArgs(sinon.match.has('method', 'yaml/get/jsonSchema'), sinon.match('/foo.yaml'))
      .resolves([{ uri: 'https://foo.com/bar.json', name: 'bar schema(1.0.0)' }]);
    clcStub.sendRequest
      .withArgs(sinon.match.has('method', 'yaml/get/all/jsonSchemas'), sinon.match.any)
      .resolves([{ versions: { '1.0.0': 'https://foo.com/bar.json' } }]);

    createJSONSchemaStatusBarItem(context, (clcStub as unknown) as CommonLanguageClient);
    const callBackFn = onDidChangeActiveTextEditorStub.firstCall.firstArg;
    await callBackFn({ document: { languageId: 'yaml', uri: vscode.Uri.parse('/foo.yaml') } });

    expect(statusBar.text).to.equal('bar schema(1.0.0)');
    expect(statusBar.tooltip).to.equal('Select JSON Schema');
    expect(statusBar.backgroundColor).to.be.undefined;
    expect(statusBar.show).calledTwice;
  });
});
