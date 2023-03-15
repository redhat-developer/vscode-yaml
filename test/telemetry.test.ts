/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as chai from 'chai';
import * as vscode from 'vscode';
import { TelemetryErrorHandler, TelemetryOutputChannel } from '../src/telemetry';
import { TelemetryEvent, TelemetryService } from '@redhat-developer/vscode-redhat-telemetry';

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
// skip this suite as `useFakeTimers` hung's vscode and CI newer finish build
describe.skip('Telemetry Test', () => {
  const sandbox = sinon.createSandbox();
  const testOutputChannel = vscode.window.createOutputChannel('YAML_TEST');
  afterEach(() => {
    sandbox.restore();
  });
  describe('TelemetryOutputChannel', () => {
    let telemetryChannel: TelemetryOutputChannel;
    let outputChannel: sinon.SinonStubbedInstance<vscode.OutputChannel>;
    let telemetry: sinon.SinonStubbedInstance<TelemetryService>;
    let clock: sinon.SinonFakeTimers;

    beforeEach(() => {
      outputChannel = sandbox.stub(testOutputChannel);
      telemetry = sandbox.stub(new TelemetryStub());
      telemetryChannel = new TelemetryOutputChannel(
        (outputChannel as unknown) as vscode.OutputChannel,
        (telemetry as unknown) as TelemetryService
      );
      clock = sinon.useFakeTimers();
    });

    afterEach(() => {
      clock.restore();
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

    it('should send telemetry if log error in "append"', () => {
      telemetryChannel.append('[Error] Some');
      clock.tick(51);
      expect(telemetry.send).calledOnceWith({ name: 'yaml.server.error', properties: { error: 'Some' } });
    });

    it('should send telemetry if log error on "appendLine"', () => {
      telemetryChannel.appendLine('[Error] Some error');
      clock.tick(51);
      expect(telemetry.send).calledOnceWith({ name: 'yaml.server.error', properties: { error: 'Some error' } });
    });

    it("shouldn't send telemetry if error should be skipped", () => {
      telemetryChannel.append(
        "[Error - 15:10:33] (node:25052) Warning: Setting the NODE_TLS_REJECT_UNAUTHORIZED environment variable to '0' makes TLS connections and HTTPS requests insecure by disabling certificate verification."
      );
      clock.tick(51);
      expect(telemetry.send).not.called;
    });

    it('should throttle send telemetry if "append" called multiple times', () => {
      telemetryChannel.append('[Error] Some');
      telemetryChannel.append('[Error] Second Error');
      clock.tick(51);
      expect(telemetry.send).calledOnceWith({ name: 'yaml.server.error', properties: { error: 'Some\nSecond Error' } });
    });

    it('should throttle send telemetry if "appendLine" called multiple times', () => {
      telemetryChannel.appendLine('[Error] Some');
      telemetryChannel.appendLine('[Error] Second Error');
      telemetryChannel.appendLine('[Error] Third Error');
      clock.tick(51);
      expect(telemetry.send).calledOnceWith({
        name: 'yaml.server.error',
        properties: { error: 'Some\nSecond Error\nThird Error' },
      });
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
        name: 'yaml.lsp.error',
        properties: { jsonrpc: 'Error message', error: 'Some' },
      });
    });
  });
});
