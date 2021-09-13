/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import { Memento } from 'vscode';
import { logToExtensionOutputChannel } from './extension';
import { IJSONSchemaCache } from './json-schema-content-provider';

const CACHE_DIR = 'schemas_cache';
const CACHE_KEY = 'json-schema-key';

interface CacheEntry {
  eTag: string;
  schemaPath: string;
}

interface SchemaCache {
  [uri: string]: CacheEntry;
}

export class JSONSchemaCache implements IJSONSchemaCache {
  private readonly cachePath: string;
  private readonly cache: SchemaCache;

  private isInitialized = false;

  constructor(globalStoragePath: string, private memento: Memento) {
    this.cachePath = path.join(globalStoragePath, CACHE_DIR);
    this.cache = memento.get(CACHE_KEY, {});
  }

  private async init(): Promise<void> {
    await fs.ensureDir(this.cachePath);
    const cachedFiles = await fs.readdir(this.cachePath);
    // clean up memento if cached files was deleted from fs
    const cachedValues = cachedFiles.map((it) => path.join(this.cachePath, it));
    for (const key in this.cache) {
      if (Object.prototype.hasOwnProperty.call(this.cache, key)) {
        const cacheEntry = this.cache[key];
        if (!cachedValues.includes(cacheEntry.schemaPath)) {
          delete this.cache[key];
        }
      }
    }
    await this.memento.update(CACHE_KEY, this.cache);
    this.isInitialized = true;
  }

  private getCacheFilePath(uri: string): string {
    const hash = crypto.createHash('MD5');
    hash.update(uri);
    const hashedURI = hash.digest('hex');
    return path.join(this.cachePath, hashedURI);
  }

  getETag(schemaUri: string): string | undefined {
    if (!this.isInitialized) {
      return undefined;
    }
    return this.cache[schemaUri]?.eTag;
  }

  async putSchema(schemaUri: string, eTag: string, schemaContent: string): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }
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
      logToExtensionOutputChannel(err);
    }
  }

  async getSchema(schemaUri: string): Promise<string | undefined> {
    if (!this.isInitialized) {
      await this.init();
    }
    const cacheFile = this.cache[schemaUri]?.schemaPath;
    if (await fs.pathExists(cacheFile)) {
      return await fs.readFile(cacheFile, { encoding: 'UTF8' });
    }

    return undefined;
  }
}
