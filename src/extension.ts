/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Copyright (c) Adam Voss. All rights reserved.
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as path from 'path';

import { workspace, Disposable, ExtensionContext, commands, languages, extensions, Uri } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, TransportKind, NotificationType } from 'vscode-languageclient';
import { schemaContributor, CUSTOM_SCHEMA_REQUEST, CUSTOM_CONTENT_REQUEST } from './schema-contributor'

export interface ISchemaAssociations {
	[pattern: string]: string[];
}

namespace SchemaAssociationNotification {
	export const type: NotificationType<ISchemaAssociations, any> = new NotificationType('json/schemaAssociations');
}

export function activate(context: ExtensionContext) {

	// The server is implemented in node
	let serverModule = context.asAbsolutePath(path.join('node_modules', 'yaml-language-server', 'out', 'server', 'src', 'server.js'));

	// The debug options for the server
	let debugOptions = { execArgv: ["--nolazy", "--debug=6009"] };

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run : { module: serverModule, transport: TransportKind.ipc },
		debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
	};

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for plain text documents
		documentSelector: ['yaml'],
		synchronize: {
			// Synchronize the setting section 'languageServerExample' to the server
			configurationSection: ['yaml', 'http.proxy', 'http.proxyStrictSSL'],
			// Notify the server about file changes to '.clientrc files contain in the workspace
			fileEvents: [
				workspace.createFileSystemWatcher('**/*.?(e)y?(a)ml'),
				workspace.createFileSystemWatcher('**/*.json')
			]
		}
	};

	// Create the language client and start the client.
	let client = new LanguageClient('yaml', 'Yaml Support', serverOptions, clientOptions);
	let disposable = client.start();

	// Push the disposable to the context's subscriptions so that the
	// client can be deactivated on extension deactivation
	context.subscriptions.push(disposable);

	client.onReady().then(() => {
		client.sendNotification(SchemaAssociationNotification.type, getSchemaAssociation(context));
		client.onRequest(CUSTOM_SCHEMA_REQUEST, (resource) => {
			return schemaContributor.requestCustomSchema(resource);
		});
		client.onRequest(CUSTOM_CONTENT_REQUEST, (uri) => {
			return schemaContributor.requestCustomSchemaContent(uri);
		});
	});

	languages.setLanguageConfiguration('yaml', {
		wordPattern: /("(?:[^\\\"]*(?:\\.)?)*"?)|[^\s{}\[\],:]+/
	});

	return schemaContributor;
}

function getSchemaAssociation(context: ExtensionContext): ISchemaAssociations {
	let associations: ISchemaAssociations = {};
	extensions.all.forEach(extension => {
		let packageJSON = extension.packageJSON;
		if (packageJSON && packageJSON.contributes && packageJSON.contributes.yamlValidation) {
			let yamlValidation = packageJSON.contributes.yamlValidation;
			if (Array.isArray(yamlValidation)) {
				yamlValidation.forEach(jv => {
					let { fileMatch, url } = jv;
					if (fileMatch && url) {
						if (url[0] === '.' && url[1] === '/') {
							url = Uri.file(path.join(extension.extensionPath, url)).toString();
						}
						if (fileMatch[0] === '%') {
							fileMatch = fileMatch.replace(/%APP_SETTINGS_HOME%/, '/User');
							fileMatch = fileMatch.replace(/%APP_WORKSPACES_HOME%/, '/Workspaces');
						} else if (fileMatch.charAt(0) !== '/' && !fileMatch.match(/\w+:\/\//)) {
							fileMatch = '/' + fileMatch;
						}
						let association = associations[fileMatch];
						if (!association) {
							association = [];
							associations[fileMatch] = association;
						}
						association.push(url);
					}
				});
			}
		}
	});
	return associations;
}
