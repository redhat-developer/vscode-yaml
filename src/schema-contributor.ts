import Uri from 'vscode-uri'

interface SchemaContributorProvider {
    readonly requestSchema: (resource: string) => string;
    readonly requestSchemaContent: (uri: string) => string;
}

class SchemaContributor {
    private _customSchemaContributors: { [index: string]: SchemaContributorProvider } = {};

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
            requestSchemaContent: (uri: string) => string) {
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
	public requestCustomSchema(resource: string) {
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
    public requestCustomSchemaContent(uri: string) {
        if (uri) {
            let _uri = Uri.parse(uri);
            if (_uri.scheme && this._customSchemaContributors[_uri.scheme] &&
                this._customSchemaContributors[_uri.scheme].requestSchemaContent) {
                return this._customSchemaContributors[_uri.scheme].requestSchemaContent(uri);
            }
        }
    }
}

// global instance
const schemaContributor = new SchemaContributor();

// constants
export const CUSTOM_SCHEMA_REQUEST = 'custom/schema/request';
export const CUSTOM_CONTENT_REQUEST = 'custom/schema/content';

export { schemaContributor } ;