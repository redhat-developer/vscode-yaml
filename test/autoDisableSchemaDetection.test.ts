/*---------------------------------------------------------------------------------------------
 *  Copyright (c) IBM Corp. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as chai from 'chai';
import * as sinon from 'sinon';
import * as vscode from 'vscode';
import type { ConfigurationRequest } from 'vscode-languageclient';
import { applyAutoDisableSchemaDetection, computeAutoDisableSchemaDetectionUpdate } from '../src/autoDisableSchemaDetection';

const expect = chai.expect;

describe('Auto-disable schema detection', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it('combines configured and automatic patterns without duplicates', () => {
    const result = computeAutoDisableSchemaDetectionUpdate('azure-pipelines.yml', ['ms-azure-devops.azure-pipelines']);
    expect(result).to.deep.equal(['azure-pipelines.yml', 'azure-pipelines.yaml']);
  });

  it('preserves configured patterns when the corresponding extension is inactive', () => {
    const result = computeAutoDisableSchemaDetectionUpdate(['azure-pipelines.yml', '**/custom.yml'], []);
    expect(result).to.deep.equal(['azure-pipelines.yml', '**/custom.yml']);
  });

  it('adds automatic patterns only to the internal language server configuration', async () => {
    const configuredYaml = {
      disableSchemaDetection: ['**/custom.yml'],
      validate: true,
    };
    sandbox
      .stub(vscode.extensions, 'getExtension')
      .callsFake((extensionId) =>
        extensionId === 'ms-azure-devops.azure-pipelines' ? ({} as vscode.Extension<unknown>) : undefined
      );
    sandbox.stub(vscode.workspace, 'getConfiguration').returns({
      get: sandbox.stub(),
    } as unknown as vscode.WorkspaceConfiguration);
    const configurations: ConfigurationRequest.HandlerSignature = sandbox.stub().resolves([configuredYaml]);

    const result = await applyAutoDisableSchemaDetection(
      {
        items: [{ section: 'yaml' }],
      },
      new vscode.CancellationTokenSource().token,
      configurations
    );

    expect(result).to.deep.equal([
      {
        disableSchemaDetection: ['**/custom.yml', 'azure-pipelines.yml', 'azure-pipelines.yaml'],
        validate: true,
      },
    ]);
    expect(configuredYaml).to.deep.equal({
      disableSchemaDetection: ['**/custom.yml'],
      validate: true,
    });
  });
});
