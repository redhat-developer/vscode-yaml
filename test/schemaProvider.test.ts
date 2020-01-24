/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import { getDocUri, activate, testCompletion, testHover, testDiagnostics, sleep, schemaJSON } from './helper';
import { Uri } from 'vscode';

describe('Tests for schema provider feature', () => {
	const docUri = getDocUri('completion/completion.yaml');
	const hoverUri = getDocUri('hover/basic.yaml');

    it('completion, hover, and validation work with registered contributor schema', async () => {
		const client = await activate(docUri);

		client.registerContributor(SCHEMA, onRequestSchemaURI, onRequestSchemaContent);
		await testCompletion(docUri, new vscode.Position(0, 0), {
			items: [
				{
                    label: "version",
					kind: 9,
					documentation: "A stringy string string"
                }
			]
		});

		await vscode.window.showTextDocument(hoverUri);
		await testHover(hoverUri, new vscode.Position(0, 3), [{
			contents: [
				"A stringy string string"
			]
		}]);

		await sleep(2000); // Wait for the diagnostics to compute on this file
		await testDiagnostics(hoverUri, [
			{
				message: "Value is not accepted. Valid values: \"test\".",
				range: new vscode.Range(new vscode.Position(0, 9), new vscode.Position(0, 14)),
				severity: 0
			}
		]);
		
	});
	
	it('Validation occurs automatically with registered contributor schema', async () => {
		const client = await activate(hoverUri);
		client.registerContributor(SCHEMA, onRequestSchemaURI, onRequestSchemaContent);

		await sleep(2000); // Wait for the diagnostics to compute on this file
		await testDiagnostics(hoverUri, [
			{
				message: "Value is not accepted. Valid values: \"test\".",
				range: new vscode.Range(new vscode.Position(0, 9), new vscode.Position(0, 14)),
				severity: 0
			}
		]);
    });
});

const SCHEMA = "myschema";

export function onRequestSchemaURI(resource: string): string | undefined {
	if (resource.endsWith('basic.yaml') || resource.endsWith('completion.yaml')) {
		return `${SCHEMA}://schema/porter`;
	}
	return undefined;
}

export function onRequestSchemaContent(schemaUri: string): string | undefined {
	const parsedUri = Uri.parse(schemaUri);
	if (parsedUri.scheme !== SCHEMA) {
		return undefined;
	}
	if (!parsedUri.path || !parsedUri.path.startsWith('/')) {
		return undefined;
	}

	return schemaJSON;
}