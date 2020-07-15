import { URI } from 'vscode-uri'
import { LanguageClient, RequestType } from 'vscode-languageclient';
import * as vscode from 'vscode';

interface SchemaContributorProvider {
	readonly requestSchema: (resource: string) => string;
	readonly requestSchemaContent: (uri: string) => string;
	readonly label?: string;
}

export enum MODIFICATION_ACTIONS {
	'delete',
	'add'
}

export interface SchemaAdditions {
	schema: string,
	action: MODIFICATION_ACTIONS.add,
	path: string,
	key: string,
	content: any
}

export interface SchemaDeletions {
	schema: string,
	action: MODIFICATION_ACTIONS.delete,
	path: string,
	key: string
}

namespace SchemaModificationNotification {
	export const type: RequestType<SchemaAdditions | SchemaDeletions, void, {}, {}> = new RequestType('json/schema/modify');
}

export interface ExtensionAPI {
	registerContributor(schema: string, requestSchema: (resource: string) => string, requestSchemaContent: (uri: string) => string, label?: string): boolean;
	modifySchemaContent(schemaModifications: SchemaAdditions | SchemaDeletions): Promise<void>;
}

class SchemaExtensionAPI implements ExtensionAPI {
	private _customSchemaContributors: { [index: string]: SchemaContributorProvider } = {};
	private _yamlClient: LanguageClient;

	constructor(client: LanguageClient) {
		this._yamlClient = client;
	}

	/**
	 * Register a custom schema provider
	 *
	 * @param {string} the provider's name
	 * @param requestSchema the requestSchema function
	 * @param requestSchemaContent the requestSchemaContent function
	 * @param label the content label, yaml key value pair, like 'apiVersion:some.api/v1'
	 * @returns {boolean}
	 */
	public registerContributor(schema: string,
		requestSchema: (resource: string) => string,
		requestSchemaContent: (uri: string) => string,
		label?: string): boolean {
		if (this._customSchemaContributors[schema]) {
			return false;
		}

		if (!requestSchema) {
			throw new Error("Illegal parameter for requestSchema.");
		}

		if (label) {
			let [first, second] = label.split(':');
			if (first && second) {
				second = second.trim();
				second = second.replace('.', '\\.');
				label = `${first}:[\t ]+${second}`;
			}
		}
		this._customSchemaContributors[schema] = <SchemaContributorProvider>{
			requestSchema,
			requestSchemaContent,
			label
		};

		return true;
	}

	/**
	 * Call requestSchema for each provider and finds all matches.
	 *
	 * @param {string} resource
	 * @returns {string} the schema uri
	 */
	public requestCustomSchema(resource: string): string[] {
		const matches = [];
		for (let customKey of Object.keys(this._customSchemaContributors)) {
			const contributor = this._customSchemaContributors[customKey];
			let uri: string;
			if (contributor.label && vscode.workspace.textDocuments) {
				const labelRegexp = new RegExp(contributor.label, 'g');
				for (const doc of vscode.workspace.textDocuments) {
					if (doc.uri.toString() === resource) {
						if (labelRegexp.test(doc.getText())) {
							uri = contributor.requestSchema(resource);
							return [uri];
						}
					}
				}
			}

			uri = contributor.requestSchema(resource);

			if (uri) {
				matches.push(uri);
			}
		}
		return matches;
	}

	/**
	 * Call requestCustomSchemaContent for named provider and get the schema content.
	 *
	 * @param {string} uri the schema uri returned from requestSchema.
	 * @returns {string} the schema content
	 */
	public requestCustomSchemaContent(uri: string): string {
		if (uri) {
			let _uri = URI.parse(uri);

			if (_uri.scheme && this._customSchemaContributors[_uri.scheme] &&
				this._customSchemaContributors[_uri.scheme].requestSchemaContent) {
				return this._customSchemaContributors[_uri.scheme].requestSchemaContent(uri);
			}
		}
	}

	public async modifySchemaContent(schemaModifications: SchemaAdditions | SchemaDeletions) {
		return this._yamlClient.sendRequest(SchemaModificationNotification.type, schemaModifications);
	}
}

// constants
export const CUSTOM_SCHEMA_REQUEST = 'custom/schema/request';
export const CUSTOM_CONTENT_REQUEST = 'custom/schema/content';

export { SchemaExtensionAPI };
