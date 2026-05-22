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

interface TestSchemaVersionItem extends vscode.QuickPickItem {
  version?: string;
  url?: string;
}

describe('Status bar should work in multiple different scenarios', () => {
  const sandbox = sinon.createSandbox();
  let clcStub: sinon.SinonStubbedInstance<TestLanguageClient>;
  let registerCommandStub: sinon.SinonStub;
  let createStatusBarItemStub: sinon.SinonStub;
  let onDidChangeActiveTextEditorStub: sinon.SinonStub;
  let onDidChangeTextDocumentStub: sinon.SinonStub;
  let createQuickPickStub: sinon.SinonStub;
  let activeTextEditor: vscode.TextEditor | undefined;

  beforeEach(() => {
    clcStub = sandbox.stub(new TestLanguageClient());
    registerCommandStub = sandbox.stub(vscode.commands, 'registerCommand');
    sandbox.stub(vscode.commands, 'executeCommand').resolves(undefined);
    createStatusBarItemStub = sandbox.stub(vscode.window, 'createStatusBarItem');
    createQuickPickStub = sandbox.stub(vscode.window, 'createQuickPick');
    onDidChangeActiveTextEditorStub = sandbox.stub(vscode.window, 'onDidChangeActiveTextEditor');
    onDidChangeTextDocumentStub = sandbox.stub(vscode.workspace, 'onDidChangeTextDocument');
    sandbox.stub(vscode.workspace, 'onDidChangeConfiguration').returns({ dispose: sandbox.stub() });
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
    expect(context.subscriptions).has.length(3);
  });

  it('Should update status bar on editor change', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub(), hide: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    createStatusBarItemStub.returns(statusBar);
    onDidChangeActiveTextEditorStub.returns({});
    clcStub.sendRequest.resolves([{ uri: 'https://foo.com/bar.json', name: 'bar schema', usedForCurrentFile: true }]);

    createJSONSchemaStatusBarItem(context, (clcStub as unknown) as CommonLanguageClient);
    const callBackFn = onDidChangeActiveTextEditorStub.firstCall.firstArg;
    await callBackFn({ document: { languageId: 'yaml', uri: vscode.Uri.parse('/foo.yaml') } });

    expect(statusBar.text).to.equal('bar schema');
    expect(statusBar.tooltip).to.equal('Select JSON Schemas');
    expect(statusBar.backgroundColor).to.be.undefined;
    expect(statusBar.show).calledOnce;
  });

  it('Should update status bar on active YAML document change', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub(), hide: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    const document = { languageId: 'yaml', uri: vscode.Uri.parse('/foo.yaml') };
    createStatusBarItemStub.returns(statusBar);
    onDidChangeTextDocumentStub.returns({});
    activeTextEditor = ({ document } as unknown) as vscode.TextEditor;
    clcStub.sendRequest.resolves([{ uri: 'https://foo.com/modeline.json', name: 'modeline schema' }]);

    createJSONSchemaStatusBarItem(context, (clcStub as unknown) as CommonLanguageClient);
    const callBackFn = onDidChangeTextDocumentStub.firstCall.firstArg;
    await callBackFn({
      document,
      contentChanges: [{ text: '# yaml-language-server: $schema=https://foo.com/modeline.json' }],
    });
    await waitForPromises();

    expect(statusBar.text).to.equal('modeline schema');
    expect(statusBar.tooltip).to.equal('Select JSON Schemas');
    expect(statusBar.show).calledTwice;
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
    expect(statusBar.tooltip).to.equal('Select JSON Schemas');
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
    clcStub.sendRequest.resolves([
      { uri: 'https://foo.com/a.json', name: 'a schema' },
      { uri: 'https://foo.com/b.json', name: 'b schema' },
    ]);

    createJSONSchemaStatusBarItem(context, (clcStub as unknown) as CommonLanguageClient);
    const callBackFn = onDidChangeActiveTextEditorStub.firstCall.firstArg;
    await callBackFn({ document: { languageId: 'yaml', uri: vscode.Uri.parse('/foo.yaml') } });

    expect(statusBar.text).to.equal('Multiple JSON Schemas');
    expect(statusBar.tooltip).to.equal('Validated using 2 JSON schemas:\na schema\nb schema');
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
    expect(statusBar.tooltip).to.equal('Select JSON Schemas');
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
    expect(statusBar.tooltip).to.equal('Select JSON Schemas');
    expect(statusBar.backgroundColor).to.be.undefined;
    expect(statusBar.show).calledOnce;
  });

  it('Should include "No JSON Schema" in schema selection', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub(), hide: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    const quickPick = createQuickPickStubValue<TestSchemaItem>();
    createStatusBarItemStub.returns(statusBar);
    createQuickPickStub.returns(quickPick);
    clcStub.sendRequest.resolves([{ uri: 'https://foo.com/bar.json', name: 'bar schema', usedForCurrentFile: true }]);
    activeTextEditor = ({
      document: { languageId: 'yaml', uri: vscode.Uri.parse('/foo.yaml') },
    } as unknown) as vscode.TextEditor;

    createJSONSchemaStatusBarItem(context, (clcStub as unknown) as CommonLanguageClient);
    const command = registerCommandStub.firstCall.args[1];
    await command();

    expect(quickPick.items[0].label).to.equal('No JSON Schema');
    expect(quickPick.canSelectMany).to.be.true;
    expect(quickPick.show).calledOnce;
  });

  it('Should add a version button to schemas with versions', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub(), hide: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    const quickPick = createQuickPickStubValue<TestSchemaItem>();
    createStatusBarItemStub.returns(statusBar);
    createQuickPickStub.returns(quickPick);
    clcStub.sendRequest.resolves([
      {
        uri: 'https://foo.com/a-v1.json',
        name: 'a schema',
        versions: {
          '1.0.0': 'https://foo.com/a-v1.json',
          '2.0.0': 'https://foo.com/a-v2.json',
        },
      },
      { uri: 'https://foo.com/b.json', name: 'b schema' },
    ]);
    activeTextEditor = ({
      document: { languageId: 'yaml', uri: vscode.Uri.parse('/foo.yaml') },
    } as unknown) as vscode.TextEditor;
    sandbox
      .stub(vscode.workspace, 'getConfiguration')
      .withArgs('yaml')
      .returns(({
        get: sandbox.stub().withArgs('disableSchemaDetection').returns([]),
      } as unknown) as vscode.WorkspaceConfiguration);

    createJSONSchemaStatusBarItem(context, (clcStub as unknown) as CommonLanguageClient);
    const command = registerCommandStub.firstCall.args[1];
    await command();
    const versionedSchemaItem = quickPick.items.find(
      (item) => (item.schema as { uri?: string })?.uri === 'https://foo.com/a-v1.json'
    );
    const unversionedSchemaItem = quickPick.items.find(
      (item) => (item.schema as { uri?: string })?.uri === 'https://foo.com/b.json'
    );

    expect(quickPick.items.some((item) => item.label === 'Select Different Version')).to.be.false;
    expect(versionedSchemaItem?.buttons).to.have.length(1);
    expect(versionedSchemaItem?.buttons?.[0].tooltip).to.equal('Select schema version');
    expect(unversionedSchemaItem?.buttons).to.be.undefined;
  });

  it('Should select "No JSON Schema" when no schema is used for the current file', async () => {
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
    sandbox
      .stub(vscode.workspace, 'getConfiguration')
      .withArgs('yaml')
      .returns(({
        get: sandbox.stub().withArgs('disableSchemaDetection').returns([]),
      } as unknown) as vscode.WorkspaceConfiguration);

    createJSONSchemaStatusBarItem(context, (clcStub as unknown) as CommonLanguageClient);
    const command = registerCommandStub.firstCall.args[1];
    await command();

    expect(quickPick.selectedItems).to.deep.equal([quickPick.items[0]]);
  });

  it('Should keep "No JSON Schema" selected when schema detection is disabled for the current file', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub(), hide: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    const quickPick = createQuickPickStubValue<TestSchemaItem>();
    createStatusBarItemStub.returns(statusBar);
    createQuickPickStub.returns(quickPick);
    clcStub.sendRequest.resolves([{ uri: 'https://foo.com/bar.json', name: 'bar schema', usedForCurrentFile: true }]);
    activeTextEditor = ({
      document: { languageId: 'yaml', uri: vscode.Uri.parse('/foo.yaml') },
    } as unknown) as vscode.TextEditor;
    sandbox
      .stub(vscode.workspace, 'getConfiguration')
      .withArgs('yaml')
      .returns(({
        get: sandbox.stub().withArgs('disableSchemaDetection').returns(['file:///foo.yaml']),
      } as unknown) as vscode.WorkspaceConfiguration);

    createJSONSchemaStatusBarItem(context, (clcStub as unknown) as CommonLanguageClient);
    const command = registerCommandStub.firstCall.args[1];
    await command();

    expect(quickPick.selectedItems).to.deep.equal([quickPick.items[0]]);
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
    await quickPick.accept();

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
    await quickPick.accept();

    expect(update).calledWith('disableSchemaDetection', ['file:///other.yaml']);
    expect(update).calledWith('schemas', { 'https://foo.com/bar.json': 'file:///foo.yaml' });
    expect(quickPick.hide).calledOnce;
  });

  it('Should replace existing exact schema mappings when a schema is selected', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub(), hide: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    const quickPick = createQuickPickStubValue<TestSchemaItem>();
    const update = sandbox.stub();
    const get = sandbox.stub();
    get.withArgs('disableSchemaDetection').returns(['foo.yaml', 'file:///other.yaml']);
    get.withArgs('schemas').returns({
      'https://foo.com/old-a.json': 'foo.yaml',
      'https://foo.com/old-b.json': ['foo.yaml', 'bar.yaml'],
    });
    createStatusBarItemStub.returns(statusBar);
    createQuickPickStub.returns(quickPick);
    clcStub.sendRequest.resolves([{ uri: 'https://foo.com/new.json', name: 'new schema' }]);
    activeTextEditor = ({
      document: { languageId: 'yaml', uri: vscode.Uri.parse('/workspace/foo.yaml') },
    } as unknown) as vscode.TextEditor;
    sandbox.stub(vscode.workspace, 'asRelativePath').returns('foo.yaml');
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
    const schemaItem = quickPick.items.find((item) => (item.schema as { uri?: string })?.uri === 'https://foo.com/new.json');
    expect(schemaItem).to.exist;
    quickPick.select([schemaItem as TestSchemaItem]);
    await quickPick.accept();

    expect(update).calledWith('disableSchemaDetection', ['file:///other.yaml']);
    expect(update).calledWith('schemas', {
      'https://foo.com/old-b.json': ['bar.yaml'],
      'https://foo.com/new.json': 'file:///workspace/foo.yaml',
    });
    expect(quickPick.hide).calledOnce;
  });

  it('Should write multiple selected schemas for the current file', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub(), hide: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    const quickPick = createQuickPickStubValue<TestSchemaItem>();
    const update = sandbox.stub();
    const get = sandbox.stub();
    get.withArgs('disableSchemaDetection').returns([]);
    get.withArgs('schemas').returns({});
    createStatusBarItemStub.returns(statusBar);
    createQuickPickStub.returns(quickPick);
    clcStub.sendRequest.resolves([
      { uri: 'https://foo.com/a.json', name: 'a schema' },
      { uri: 'https://foo.com/b.json', name: 'b schema' },
    ]);
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
    const schemaItems = quickPick.items.filter((item) => item.schema);
    expect(schemaItems).has.length(2);
    quickPick.select(schemaItems as TestSchemaItem[]);
    await quickPick.accept();

    expect(update).calledWith('disableSchemaDetection', []);
    expect(update).calledWith('schemas', {
      'https://foo.com/a.json': 'file:///foo.yaml',
      'https://foo.com/b.json': 'file:///foo.yaml',
    });
    expect(quickPick.hide).calledOnce;
  });

  it('Should use and auto-select "No JSON Schema" when all schemas are deselected', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub(), hide: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    const quickPick = createQuickPickStubValue<TestSchemaItem>();
    const update = sandbox.stub();
    createStatusBarItemStub.returns(statusBar);
    createQuickPickStub.returns(quickPick);
    clcStub.sendRequest.resolves([{ uri: 'https://foo.com/bar.json', name: 'bar schema', usedForCurrentFile: true }]);
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
    expect(quickPick.selectedItems).has.length(1);
    quickPick.select([]);
    expect(quickPick.selectedItems).to.deep.equal([quickPick.items[0]]);
    await quickPick.accept();

    expect(update).calledWith('disableSchemaDetection', ['file:///foo.yaml']);
    expect(update).not.calledWith('schemas');
    expect(quickPick.hide).calledOnce;
  });

  it('Should auto-deselect all other selected schemas when "No JSON Schema" is selected', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub(), hide: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    const quickPick = createQuickPickStubValue<TestSchemaItem>();
    const update = sandbox.stub();
    createStatusBarItemStub.returns(statusBar);
    createQuickPickStub.returns(quickPick);
    clcStub.sendRequest.resolves([{ uri: 'https://foo.com/bar.json', name: 'bar schema', usedForCurrentFile: true }]);
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
    const noSchemaItem = quickPick.items[0];
    const schemaItem = quickPick.items.find((item) => item.schema);
    expect(schemaItem).to.exist;
    expect(quickPick.selectedItems).to.deep.equal([schemaItem]);
    quickPick.select([schemaItem as TestSchemaItem, noSchemaItem]);
    expect(quickPick.selectedItems).to.deep.equal([noSchemaItem]);
    await quickPick.accept();

    expect(update).calledWith('disableSchemaDetection', ['file:///foo.yaml']);
    expect(update).not.calledWith('schemas');
    expect(quickPick.hide).calledOnce;
  });

  it('Should deselect "No JSON Schema" when a schema is selected', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub(), hide: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    const quickPick = createQuickPickStubValue<TestSchemaItem>();
    const update = sandbox.stub();
    const get = sandbox.stub();
    get.withArgs('disableSchemaDetection').returns([]);
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
    const noSchemaItem = quickPick.items[0];
    const schemaItem = quickPick.items.find((item) => item.schema);
    expect(schemaItem).to.exist;
    quickPick.select([noSchemaItem, schemaItem as TestSchemaItem]);
    expect(quickPick.selectedItems).to.deep.equal([schemaItem]);
    await quickPick.accept();

    expect(update).calledWith('disableSchemaDetection', []);
    expect(update).calledWith('schemas', { 'https://foo.com/bar.json': 'file:///foo.yaml' });
    expect(quickPick.hide).calledOnce;
  });

  it('Should select a schema version using the schema item button and preserve other selected schemas', async () => {
    const context: vscode.ExtensionContext = {
      subscriptions: [],
    } as vscode.ExtensionContext;
    const statusBar = ({ show: sandbox.stub(), hide: sandbox.stub() } as unknown) as vscode.StatusBarItem;
    const schemaPick = createQuickPickStubValue<TestSchemaItem>();
    const versionPick = createQuickPickStubValue<TestSchemaVersionItem>();
    const update = sandbox.stub();
    const get = sandbox.stub();
    get.withArgs('disableSchemaDetection').returns([]);
    get.withArgs('schemas').returns({});
    createStatusBarItemStub.returns(statusBar);
    createQuickPickStub.onFirstCall().returns(schemaPick);
    createQuickPickStub.onSecondCall().returns(versionPick);
    clcStub.sendRequest.resolves([
      {
        uri: 'https://foo.com/a-v1.json',
        name: 'a schema',
        usedForCurrentFile: true,
        versions: {
          '1.0.0': 'https://foo.com/a-v1.json',
          '2.0.0': 'https://foo.com/a-v2.json',
        },
      },
      { uri: 'https://foo.com/b.json', name: 'b schema', usedForCurrentFile: true },
    ]);
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
    const versionedSchemaItem = schemaPick.items.find(
      (item) => (item.schema as { uri?: string })?.uri === 'https://foo.com/a-v1.json'
    );
    expect(versionedSchemaItem?.buttons).to.have.length(1);
    await schemaPick.triggerItemButton(versionedSchemaItem as TestSchemaItem, versionedSchemaItem.buttons[0]);

    const versionItem = versionPick.items.find((item) => item.version === '2.0.0');
    expect(versionPick.title).to.equal('Select JSON Schema version for a schema');
    expect(versionItem).to.exist;
    await versionPick.select([versionItem as TestSchemaVersionItem]);

    expect(schemaPick.hide).calledOnce;
    expect(update).calledWith('disableSchemaDetection', []);
    expect(update).calledWith('schemas', {
      'https://foo.com/b.json': 'file:///foo.yaml',
      'https://foo.com/a-v2.json': 'file:///foo.yaml',
    });
    expect(versionPick.hide).calledOnce;
  });
});

function createQuickPickStubValue<T extends vscode.QuickPickItem>(): vscode.QuickPick<T> & {
  accept: () => Promise<void>;
  select: (items: T[]) => Promise<void>;
  triggerItemButton: (item: T, button: vscode.QuickInputButton) => Promise<void>;
} {
  let acceptHandler: () => void | Promise<void>;
  let itemButtonHandler: (event: vscode.QuickPickItemButtonEvent<T>) => void | Promise<void>;
  let selectionHandler: (items: readonly T[]) => void;
  let hideHandler: () => void;
  const quickPick = {
    items: [] as readonly T[],
    selectedItems: [] as readonly T[],
    canSelectMany: false,
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
    onDidAccept: sinon.stub().callsFake((handler: () => void) => {
      acceptHandler = handler;
      return { dispose: sinon.stub() };
    }),
    onDidTriggerItemButton: sinon.stub().callsFake((handler: (event: vscode.QuickPickItemButtonEvent<T>) => void) => {
      itemButtonHandler = handler;
      return { dispose: sinon.stub() };
    }),
    accept: () => Promise.resolve(acceptHandler?.()),
    select: (items: T[]) => {
      quickPick.selectedItems = items;
      return Promise.resolve(selectionHandler?.(items));
    },
    triggerItemButton: (item: T, button: vscode.QuickInputButton) => Promise.resolve(itemButtonHandler?.({ item, button })),
  };
  quickPick.hide.callsFake(() => hideHandler?.());
  quickPick.onDidHide.callsFake((handler: () => void) => {
    hideHandler = handler;
    return { dispose: sinon.stub() };
  });
  return (quickPick as unknown) as vscode.QuickPick<T> & {
    accept: () => Promise<void>;
    select: (items: T[]) => Promise<void>;
    triggerItemButton: (item: T, button: vscode.QuickInputButton) => Promise<void>;
  };
}

function waitForPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
