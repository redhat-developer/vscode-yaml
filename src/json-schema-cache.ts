/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';

const CACHE_DIR = 'schemas_cache';
const CACHE_HOURS = 5 * 24; // 5 days
export class JSONSchemaCache {
  private readonly cachePath: string;

  private isInitialized = false;

  constructor(globalStoragePath: string) {
    this.cachePath = path.join(globalStoragePath, CACHE_DIR);
    this.init();
  }

  private async init(): Promise<void> {
    await fs.ensureDir(this.cachePath);
    this.isInitialized = true;
  }

  private getCacheFilePath(uri: string): string {
    const hash = crypto.createHash('MD5');
    hash.update(uri);
    const hashedURI = hash.digest('hex');
    return path.join(this.cachePath, hashedURI);
  }

  async putSchema(schemaUri: string, schemaContent: string): Promise<void> {
    const cacheFile = this.getCacheFilePath(schemaUri);
    if (await fs.pathExists(cacheFile)) {
      await fs.remove(cacheFile);
    }

    await fs.writeFile(cacheFile, schemaContent);
  }

  async getSchema(schemaUri: string): Promise<string | undefined> {
    if (!this.isInitialized) {
      return undefined;
    }
    const cacheFile = this.getCacheFilePath(schemaUri);
    if (await fs.pathExists(cacheFile)) {
      const stat = await fs.stat(cacheFile);
      const cacheTTLDate = new Date();
      cacheTTLDate.setHours(cacheTTLDate.getHours() - CACHE_HOURS);
      if (stat.mtime <= cacheTTLDate) {
        await fs.remove(cacheFile);
        return undefined;
      }
      return await fs.readFile(cacheFile, { encoding: 'UTF8' });
    }

    return undefined;
  }
}
