/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TelemetryEvent, TelemetryService } from '@redhat-developer/vscode-redhat-telemetry';
import { CloseAction, ErrorAction, ErrorHandler, Message } from 'vscode-languageclient/node';
import * as vscode from 'vscode';

export class DummyTelemetryService implements TelemetryService {
  async sendStartupEvent(): Promise<void> {
    // do nothing
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async send(event: TelemetryEvent): Promise<void> {
    // do nothing
    return;
  }
  async sendShutdownEvent(): Promise<void> {
    // do nothing
    return;
  }
  async flushQueue(): Promise<void> {
    // do nothing
    return;
  }
  async dispose(): Promise<void> {
    // do nothing
    return;
  }
}

export class TelemetryErrorHandler implements ErrorHandler {
  private restarts: number[] = [];
  constructor(
    private readonly telemetry: TelemetryService,
    private readonly name: string,
    private readonly maxRestartCount: number
  ) {}

  error(error: Error, message: Message, count: number): ErrorAction {
    this.telemetry.send({ name: 'yaml.lsp.error', properties: { jsonrpc: message.jsonrpc, error: error.message } });
    if (count && count <= 3) {
      return ErrorAction.Continue;
    }
    return ErrorAction.Shutdown;
  }
  closed(): CloseAction {
    this.restarts.push(Date.now());
    if (this.restarts.length <= this.maxRestartCount) {
      return CloseAction.Restart;
    } else {
      const diff = this.restarts[this.restarts.length - 1] - this.restarts[0];
      if (diff <= 3 * 60 * 1000) {
        vscode.window.showErrorMessage(
          `The ${this.name} server crashed ${
            this.maxRestartCount + 1
          } times in the last 3 minutes. The server will not be restarted.`
        );
        return CloseAction.DoNotRestart;
      } else {
        this.restarts.shift();
        return CloseAction.Restart;
      }
    }
  }
}

export class TelemetryOutputChannel implements vscode.OutputChannel {
  constructor(private readonly delegate: vscode.OutputChannel, private readonly telemetry: TelemetryService) {}

  get name(): string {
    return this.delegate.name;
  }
  append(value: string): void {
    this.checkError(value);
    this.delegate.append(value);
  }
  appendLine(value: string): void {
    this.checkError(value);
    this.delegate.appendLine(value);
  }

  private checkError(value: string): void {
    if (value.startsWith('[Error') || value.startsWith('  Message: Request')) {
      this.telemetry.send({ name: 'yaml.server.error', properties: { error: value } });
    }
  }
  clear(): void {
    this.delegate.clear();
  }
  show(preserveFocus?: boolean): void;
  show(column?: vscode.ViewColumn, preserveFocus?: boolean): void;
  show(column?: never, preserveFocus?: boolean): void {
    this.delegate.show(column, preserveFocus);
  }
  hide(): void {
    this.delegate.hide();
  }
  dispose(): void {
    this.delegate.dispose();
  }
}
