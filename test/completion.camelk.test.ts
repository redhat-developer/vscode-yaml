/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import { getDocUri, activate, testCompletion, updateSettings, testCompletionNotEmpty, resetSettings } from './helper';


describe('Completion should work with Camel K files', () => {

	afterEach(async () => {
		await resetSettings("schemas", {});
        await resetSettings("schemaStore.enable", true);
    });

    it('completion works with first level', async () => {
		const docUri = getDocUri('completion/completion.camelk.yaml');
        await activate(docUri);
        await updateSettings("schemas", {
            "./schemas/camelk_schema.json": "*.camelk.yaml"
        });
		await testCompletion(docUri, new vscode.Position(0, 2), {
			items: [
				{
                    label: "from",
                    kind: 9
				},
				{
                    label: "error-handler",
                    kind: 9
				},
				{
                    label: "on-exception",
                    kind: 9
				},
				{
                    label: "rest",
                    kind: 9
				},
				{
                    label: "route",
                    kind: 9
                }
			]
		});
	});

	it('completion works with second level', async () => {
		const docUri = getDocUri('completion/completion-secondlevel.camelk.yaml');
        await activate(docUri);
        await updateSettings("schemas", {
            "./schemas/camelk_schema.json": "*.camelk.yaml"
        });
		await testCompletion(docUri, new vscode.Position(1, 4), {
			items: [
				{
                    label: "uri",
                    kind: 9
				},
				{
                    label: "steps",
                    kind: 9
				},
				{
                    label: "parameters",
                    kind: 9
				}
			]
		});
	});

});
