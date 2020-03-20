/*-----------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See LICENSE file in the project root for license information.
 *-----------------------------------------------------------------------------------------------*/


import * as vscode from 'vscode';

import segmentanalytics = require('analytics-node');

const segmentToken = 'e2CYiNSApF1YqFUVPWtOhjf02W6ouAc4';

export class Metrics {

  static shallSendMetrics()  {
    if (vscode.workspace.getConfiguration("yaml").get("collectTelemetryData")) {
        return true;
    }
    return false;
  }

  public static publishUsageMetrics(message: string, yamlInfo: string) {
    const analytics = new segmentanalytics(segmentToken);

      if (Metrics.shallSendMetrics()) {
           analytics.track({
            userId: 'anonymous',
            event: message,
            properties: {
              "json-schema": yamlInfo
            }
          });
      }
  }
}
