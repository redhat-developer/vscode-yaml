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

interface TestSchemaItem extends vscode.QuickPickItem {
  schema?: unknown;
}

describe('Status bar should work in multiple different scenarios', () => {
  const sandbox = sinon.createSandbox();
  let clcStub: sinon.SinonStubbedInstance<TestLanguageClient>;
  let registerCommandStub: sinon.SinonStub;
  let createStatusBarItemStub: sinon.SinonStub;
  let onDidChangeActiveTextEditorStub: sinon.SinonStub;
  let createQuickPickStub: sinon.SinonStub;
  let activeTextEditor: vscode.TextEditor | undefined;

  beforeEach(() => {
    clcStub = sandbox.stub(new TestLanguageClient());
    registerCommandStub = sandbox.stub(vscode.commands, 'registerCommand');
    createStatusBarItemStub = sandbox.stub(vscode.window, 'createStatusBarItem');
    createQuickPickStub = sandbox.stub(vscode.window, 'createQuickPick');
    onDidChangeActiveTextEditorStub = sandbox.stub(vscode.window, 'onDidChangeActiveTextEditor');
    activeTextEditor = undefined;
    sandbox.stub(vscode.window, 'activeTextEditor').get(() => activeTextEditor);
    sandbox.stub(jsonStatusBar, 'statusBarItem').returns(undefined);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('Should create status bar item for JSON Schema', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub(), hide: sandbox.stub() } as unknown) as vscode.StatusBarItem;
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
    const statusBar = ({ show: sandbox.stub(), hide: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    createStatusBarItemStub.returns(statusBar);
    onDidChangeActiveTextEditorStub.returns({});
    clcStub.sendRequest.resolves([{ uri: 'https://foo.com/bar.json', name: 'bar schema' }]);

    createJSONSchemaStatusBarItem(context, (clcStub as unknown) as CommonLanguageClient);
    const callBackFn = onDidChangeActiveTextEditorStub.firstCall.firstArg;
    await callBackFn({ document: { languageId: 'yaml', uri: vscode.Uri.parse('/foo.yaml') } });

    expect(statusBar.text).to.equal('bar schema');
    expect(statusBar.tooltip).to.equal('Select JSON Schema');
    expect(statusBar.backgroundColor).to.be.undefined;
    expect(statusBar.show).calledOnce;
  });

  it('Should inform if there are no schema', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub(), hide: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    createStatusBarItemStub.returns(statusBar);
    onDidChangeActiveTextEditorStub.returns({});
    clcStub.sendRequest.resolves([]);

    createJSONSchemaStatusBarItem(context, (clcStub as unknown) as CommonLanguageClient);
    const callBackFn = onDidChangeActiveTextEditorStub.firstCall.firstArg;
    await callBackFn({ document: { languageId: 'yaml', uri: vscode.Uri.parse('/foo.yaml') } });

    expect(statusBar.text).to.equal('No JSON Schema');
    expect(statusBar.tooltip).to.equal('Select JSON Schema');
    expect(statusBar.backgroundColor).to.be.undefined;
    expect(statusBar.show).calledOnce;
  });

  it('Should inform if there are more than one schema', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub(), hide: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    createStatusBarItemStub.returns(statusBar);
    onDidChangeActiveTextEditorStub.returns({});
    clcStub.sendRequest.resolves([{}, {}]);

    createJSONSchemaStatusBarItem(context, (clcStub as unknown) as CommonLanguageClient);
    const callBackFn = onDidChangeActiveTextEditorStub.firstCall.firstArg;
    await callBackFn({ document: { languageId: 'yaml', uri: vscode.Uri.parse('/foo.yaml') } });

    expect(statusBar.text).to.equal('Multiple JSON Schemas...');
    expect(statusBar.tooltip).to.equal('Multiple JSON Schema used to validate this file, click to select one');
    expect(statusBar.backgroundColor).to.eql({ id: 'statusBarItem.warningBackground' });
    expect(statusBar.show).calledOnce;
  });

  it('Should show JSON Schema Store schema version', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub(), hide: sandbox.stub() } as unknown) as vscode.StatusBarItem;
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
    expect(statusBar.show).calledOnce;
  });

  it('Should show JSON Schema Store schema version, dont include version', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub(), hide: sandbox.stub() } as unknown) as vscode.StatusBarItem;
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
    expect(statusBar.show).calledOnce;
  });

  it('Should include No JSON Schema in schema selection', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub(), hide: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    const quickPick = createQuickPickStubValue<TestSchemaItem>();
    createStatusBarItemStub.returns(statusBar);
    createQuickPickStub.returns(quickPick);
    clcStub.sendRequest.resolves([{ uri: 'https://foo.com/bar.json', name: 'bar schema' }]);
    activeTextEditor = ({
      document: { languageId: 'yaml', uri: vscode.Uri.parse('/foo.yaml') },
    } as unknown) as vscode.TextEditor;

    createJSONSchemaStatusBarItem(context, (clcStub as unknown) as CommonLanguageClient);
    const command = registerCommandStub.firstCall.args[1];
    await command();

    expect(quickPick.items[0].label).to.equal('No JSON Schema');
    expect(quickPick.show).calledOnce;
  });

  it('Should write disableSchemaDetection when No JSON Schema is selected', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub(), hide: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    const quickPick = createQuickPickStubValue<TestSchemaItem>();
    const update = sandbox.stub();
    createStatusBarItemStub.returns(statusBar);
    createQuickPickStub.returns(quickPick);
    clcStub.sendRequest.resolves([{ uri: 'https://foo.com/bar.json', name: 'bar schema' }]);
    activeTextEditor = ({
      document: { languageId: 'yaml', uri: vscode.Uri.parse('/foo.yaml') },
    } as unknown) as vscode.TextEditor;
    sandbox
      .stub(vscode.workspace, 'getConfiguration')
      .withArgs('yaml')
      .returns(({
        get: sandbox.stub().withArgs('disableSchemaDetection').returns([]),
        update,
      } as unknown) as vscode.WorkspaceConfiguration);

    createJSONSchemaStatusBarItem(context, (clcStub as unknown) as CommonLanguageClient);
    const command = registerCommandStub.firstCall.args[1];
    await command();
    quickPick.select([quickPick.items[0]]);

    expect(update).calledWith('disableSchemaDetection', ['file:///foo.yaml']);
    expect(quickPick.hide).calledOnce;
  });

  it('Should clear disableSchemaDetection when a schema is selected', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub(), hide: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    const quickPick = createQuickPickStubValue<TestSchemaItem>();
    const update = sandbox.stub();
    const get = sandbox.stub();
    get.withArgs('disableSchemaDetection').returns(['file:///foo.yaml', 'file:///other.yaml']);
    get.withArgs('schemas').returns({});
    createStatusBarItemStub.returns(statusBar);
    createQuickPickStub.returns(quickPick);
    clcStub.sendRequest.resolves([{ uri: 'https://foo.com/bar.json', name: 'bar schema' }]);
    activeTextEditor = ({
      document: { languageId: 'yaml', uri: vscode.Uri.parse('/foo.yaml') },
    } as unknown) as vscode.TextEditor;
    sandbox
      .stub(vscode.workspace, 'getConfiguration')
      .withArgs('yaml')
      .returns(({
        get,
        update,
      } as unknown) as vscode.WorkspaceConfiguration);

    createJSONSchemaStatusBarItem(context, (clcStub as unknown) as CommonLanguageClient);
    const command = registerCommandStub.firstCall.args[1];
    await command();
    const schemaItem = quickPick.items.find((item) => item.schema);
    expect(schemaItem).to.exist;
    quickPick.select([schemaItem as TestSchemaItem]);

    expect(update).calledWith('disableSchemaDetection', ['file:///other.yaml']);
    expect(update).calledWith('schemas', { 'https://foo.com/bar.json': 'file:///foo.yaml' });
    expect(quickPick.hide).calledOnce;
  });
});

function createQuickPickStubValue<T extends vscode.QuickPickItem>(): vscode.QuickPick<T> & { select: (items: T[]) => void } {
  let selectionHandler: (items: readonly T[]) => void;
  let hideHandler: () => void;
  const quickPick = {
    items: [] as readonly T[],
    placeholder: '',
    title: '',
    show: sinon.stub(),
    hide: sinon.stub(),
    dispose: sinon.stub(),
    onDidHide: sinon.stub(),
    onDidChangeSelection: sinon.stub().callsFake((handler: (items: readonly T[]) => void) => {
      selectionHandler = handler;
      return { dispose: sinon.stub() };
    }),
    select: (items: T[]) => selectionHandler(items),
  };
  quickPick.hide.callsFake(() => hideHandler?.());
  quickPick.onDidHide.callsFake((handler: () => void) => {
    hideHandler = handler;
    return { dispose: sinon.stub() };
  });
  return (quickPick as unknown) as vscode.QuickPick<T> & { select: (items: T[]) => void };
}
