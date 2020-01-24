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
    registerCustomSchemaContentModifier(uri: string, callback: (jsonSchema: any) => string): void;
}

class SchemaExtensionAPI implements ExtensionAPI {
    private _customSchemaContributors: { [index: string]: SchemaContributorProvider } = {};
    private _customSchemaContentModifiers: { [index: string]: (jsonSchema: any) => string } = {};
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
	 * Call requestSchema for each provider and find the first one who reports he can provide the schema.
	 *
	 * @param {string} resource
	 * @returns {string} the schema uri
	 */
	public requestCustomSchema(resource: string): string {
        for (let customKey of Object.keys(this._customSchemaContributors)) {
            const contributor = this._customSchemaContributors[customKey];
            const uri = contributor.requestSchema(resource);

            if (uri) {
                return uri;
            }
        }
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
                const schemaContent = this._customSchemaContributors[_uri.scheme].requestSchemaContent(uri);
                const cb = this._customSchemaContentModifiers[_uri.scheme];
                if (cb){
                    return cb(schemaContent);
                }
                return schemaContent;
            }
        }
    }

    /**
     * Call registerCustomSchemaContentModifier when you want to perform some schema modifications
     * on a URI that is registered with registerContributor API before sending it back server side
     *
     * @param uri the uri of the schema you want to perform modifications on
     * @param callback the actions you want to perform on the json object 
     */
    public registerCustomSchemaContentModifier(uri: string, callback: (jsonSchema: any) => string) {
        this._customSchemaContentModifiers[uri] = callback;
    }

    public async modifySchemaContent(schemaModifications: SchemaAdditions | SchemaDeletions) {
        return this._yamlClient.sendRequest(SchemaModificationNotification.type, schemaModifications);
    }
}

// constants
export const CUSTOM_SCHEMA_REQUEST = 'custom/schema/request';
export const CUSTOM_CONTENT_REQUEST = 'custom/schema/content';

export { SchemaExtensionAPI };