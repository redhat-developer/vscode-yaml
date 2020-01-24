import { URI } from 'vscode-uri'
import { LanguageClient, RequestType } from 'vscode-languageclient';

interface SchemaContributorProvider {
    readonly requestSchema: (resource: string) => string;
    readonly requestSchemaContent: (uri: string) => string;
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
    export const type: RequestType<SchemaAdditions | SchemaDeletions, void, { }, { }> = new RequestType('json/schema/modify');
}

export interface ExtensionAPI {
    registerContributor(schema: string, requestSchema: (resource: string) => string, requestSchemaContent: (uri: string) => string): boolean;
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
	 * @returns {boolean}
	 */
    public registerContributor(schema: string,
            requestSchema: (resource: string) => string,
            requestSchemaContent: (uri: string) => string): boolean {
        if (this._customSchemaContributors[schema]) {
            return false;
        }

        if (!requestSchema) {
            throw new Error("Illegal parameter for requestSchema.");
        }

        this._customSchemaContributors[schema] = <SchemaContributorProvider>{
            requestSchema,
            requestSchemaContent
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
            const uri = contributor.requestSchema(resource);

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