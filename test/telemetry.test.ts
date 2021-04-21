/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chai from 'chai';
import * as vscode from 'vscode';
import { TelemetryErrorHandler, TelemetryOutputChannel } from '../src/telemetry';
import { TelemetryEvent, TelemetryService } from '@redhat-developer/vscode-redhat-telemetry/lib/interfaces/telemetry';

const expect = chai.expect;
chai.use(sinonChai);
class TelemetryStub implements TelemetryService {
  sendStartupEvent(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  send(event: TelemetryEvent): Promise<void> {
    throw new Error('Method not implemented.');
  }
  sendShutdownEvent(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  flushQueue(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  dispose(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
describe('Telemetry Test', () => {
  const sandbox = sinon.createSandbox();
  const testOutputChannel = vscode.window.createOutputChannel('YAML_TEST');
  afterEach(() => {
    sandbox.restore();
  });
  describe('TelemetryOutputChannel', () => {
    let telemetryChannel: TelemetryOutputChannel;
    let outputChannel: sinon.SinonStubbedInstance<vscode.OutputChannel>;
    let telemetry: sinon.SinonStubbedInstance<TelemetryService>;
    beforeEach(() => {
      outputChannel = sandbox.stub(testOutputChannel);
      telemetry = sandbox.stub(new TelemetryStub());
      telemetryChannel = new TelemetryOutputChannel(
        (outputChannel as unknown) as vscode.OutputChannel,
        (telemetry as unknown) as TelemetryService
      );
    });

    it('should delegate "append" method', () => {
      telemetryChannel.append('Some');
      expect(outputChannel.append).calledOnceWith('Some');
    });

    it('should delegate "appendLine" method', () => {
      telemetryChannel.appendLine('Some');
      expect(outputChannel.appendLine).calledOnceWith('Some');
    });

    it('should delegate "clear" method', () => {
      telemetryChannel.clear();
      expect(outputChannel.clear).calledOnce;
    });

    it('should delegate "dispose" method', () => {
      telemetryChannel.dispose();
      expect(outputChannel.dispose).calledOnce;
    });

    it('should delegate "hide" method', () => {
      telemetryChannel.hide();
      expect(outputChannel.hide).calledOnce;
    });

    it('should delegate "show" method', () => {
      telemetryChannel.show();
      expect(outputChannel.show).calledOnce;
    });

    it('should send telemetry if log error', () => {
      telemetryChannel.append('[Error Some');
      expect(telemetry.send).calledOnceWith({ name: 'server_error', properties: { error_message: '[Error Some' } });
    });

    it('should send telemetry if log error2', () => {
      telemetryChannel.appendLine('[Error Some');
      expect(telemetry.send).calledOnceWith({ name: 'server_error', properties: { error_message: '[Error Some' } });
    });
  });

  describe('TelemetryErrorHandler', () => {
    let telemetry: sinon.SinonStubbedInstance<TelemetryService>;
    let errorHandler: TelemetryErrorHandler;

    beforeEach(() => {
      telemetry = sandbox.stub(new TelemetryStub());
      errorHandler = new TelemetryErrorHandler(telemetry, 'YAML LS', 3);
    });

    it('should log telemetry on error', () => {
      errorHandler.error(new Error('Some'), { jsonrpc: 'Error message' }, 3);
      expect(telemetry.send).calledOnceWith({
        name: 'LSP Error',
        properties: { jsonrpc: 'Error message', error: 'Some' },
      });
    });
  });
});
