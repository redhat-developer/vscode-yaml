/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

export interface IHandler {
  handle(extName: string, message: string): Promise<void>;

  canRecommendExtension(extName: string): boolean;
}
