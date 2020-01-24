/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat, Inc. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';
import { getDocUri, activate, testCompletion } from './helper';
import { Uri } from 'vscode';
import { ExtensionAPI } from '../src/schema-extension-api';

describe('Tests for schema modifier feature', () => {
	const docUri = getDocUri('completion/completion_modification.yaml');

    it('modification happens before being sent back to language server', async () => {
		const client: ExtensionAPI = await activate(docUri);

		client.registerContributor(SCHEMA, onRequestSchemaURI, onRequestSchemaContent);
        client.registerCustomSchemaContentModifier(SCHEMA, objStringified => {
            const obj = JSON.parse(objStringified);
            obj.properties.version.description = 'hello world!';
            return JSON.stringify(obj);
        });

        await testCompletion(docUri, new vscode.Position(0, 0), {
			items: [
				{
                    label: "version",
                    documentation: 'hello world!',
                    kind: 9
                }
			]
		});
                

	});
	
});

const SCHEMA = "myotherschema";

export function onRequestSchemaURI(resource: string): string | undefined {
	if (resource.endsWith('completion_modification.yaml')) {
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

export const schemaJSON = JSON.stringify({
	type: "object",
	properties: {
		version: {
			type: "string",
			description: "my description",
		}
	}
});

