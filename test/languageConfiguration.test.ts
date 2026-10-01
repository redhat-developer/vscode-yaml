/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

describe('Language configuration', () => {
  it('increases indentation after a key or list item with an anchor', () => {
    const configPath = path.resolve(__dirname, '..', '..', 'language-configuration.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const increaseIndentPattern = new RegExp(config.indentationRules.increaseIndentPattern);
    assert.ok(increaseIndentPattern.test('base: &base'));
    assert.ok(increaseIndentPattern.test('- &item'));
  });
});
