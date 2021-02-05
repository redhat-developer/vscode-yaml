/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import { Memento } from 'vscode';

const CACHE_DIR = 'schemas_cache';
const CACHE_KEY = 'json-schema-key';

interface CacheEntry {
  eTag: string;
  schemaPath: string;
}

interface SchemaCache {
  [uri: string]: CacheEntry;
}

export class JSONSchemaCache {
  private readonly cachePath: string;
  private readonly cache: SchemaCache;

  private isInitialized = false;

  constructor(globalStoragePath: string, private memento: Memento) {
    this.cachePath = path.join(globalStoragePath, CACHE_DIR);
    this.cache = memento.get(CACHE_KEY, {});
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

  getETag(schemaUri: string): string | undefined {
    return this.cache[schemaUri]?.eTag;
  }

  async putSchema(schemaUri: string, eTag: string, schemaContent: string): Promise<void> {
    if (!this.cache[schemaUri]) {
      this.cache[schemaUri] = { eTag, schemaPath: this.getCacheFilePath(schemaUri) };
    } else {
      this.cache[schemaUri].eTag = eTag;
    }
    try {
      const cacheFile = this.cache[schemaUri].schemaPath;
      await fs.writeFile(cacheFile, schemaContent);

      await this.memento.update(CACHE_KEY, this.cache);
    } catch (err) {
      delete this.cache[schemaUri];
      console.error(err);
    }
  }

  async getSchema(schemaUri: string): Promise<string | undefined> {
    if (!this.isInitialized) {
      return undefined;
    }
    const cacheFile = this.cache[schemaUri]?.schemaPath;
    if (await fs.pathExists(cacheFile)) {
      return await fs.readFile(cacheFile, { encoding: 'UTF8' });
    }

    return undefined;
  }
}
