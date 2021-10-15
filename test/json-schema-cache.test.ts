/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chai from 'chai';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { JSONSchemaCache } from '../src/json-schema-cache';
import { TestMemento } from './helper';

const expect = chai.expect;
chai.use(sinonChai);
describe('JSON Schema Cache Tests', () => {
  const sandbox = sinon.createSandbox();
  let memento: sinon.SinonStubbedInstance<vscode.Memento>;
  let ensureDirStub: sinon.SinonStub;
  let readdirStub: sinon.SinonStub;
  let pathExistsStub: sinon.SinonStub;
  let readFileStub: sinon.SinonStub;

  afterEach(() => {
    sandbox.restore();
  });

  beforeEach(() => {
    memento = sandbox.stub(new TestMemento());
    ensureDirStub = sandbox.stub(fs, 'ensureDir');
    readdirStub = sandbox.stub(fs, 'readdir');
    pathExistsStub = sandbox.stub(fs, 'pathExists');
    readFileStub = sandbox.stub(fs, 'readFile');
  });

  it('should clean up cache if there are no schema file', async () => {
    memento.get.returns({ somePath: { schemaPath: '/foo/path/' } });
    memento.update.resolves();

    ensureDirStub.resolves();
    readdirStub.resolves([]);

    pathExistsStub.resolves(false);
    readFileStub.resolves();

    const cache = new JSONSchemaCache('/some/path/', (memento as unknown) as vscode.Memento);
    const result = await cache.getSchema('/some/uri');
    expect(result).is.undefined;
    expect(memento.update).calledOnceWith('json-schema-key', {});
  });

  it('should check cache', async () => {
    const mementoData = { somePath: { schemaPath: '/some/path/foo.json' } };
    memento.get.returns(mementoData);
    memento.update.resolves();

    ensureDirStub.resolves();
    readdirStub.resolves(['foo.json']);

    pathExistsStub.resolves(false);
    readFileStub.resolves();

    const cache = new JSONSchemaCache('/some/path/', (memento as unknown) as vscode.Memento);
    const result = await cache.getSchema('/some/uri');
    expect(result).is.undefined;
    expect(memento.update).calledOnceWith('json-schema-key', mementoData);
  });
});
