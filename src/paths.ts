/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Uri } from 'vscode';

const Dot = '.'.charCodeAt(0);

export function normalizePath(parts: string[]): string {
  const newParts: string[] = [];
  for (const part of parts) {
    if (part.length === 0 || (part.length === 1 && part.charCodeAt(0) === Dot)) {
      // ignore
    } else if (part.length === 2 && part.charCodeAt(0) === Dot && part.charCodeAt(1) === Dot) {
      newParts.pop();
    } else {
      newParts.push(part);
    }
  }
  if (parts.length > 1 && parts[parts.length - 1].length === 0) {
    newParts.push('');
  }
  let res = newParts.join('/');
  if (parts[0].length === 0) {
    res = '/' + res;
  }
  return res;
}

export function joinPath(uri: Uri, ...paths: string[]): Uri {
  const parts = uri.path.split('/');
  for (const path of paths) {
    parts.push(...path.split('/'));
  }
  return uri.with({ path: normalizePath(parts) });
}
