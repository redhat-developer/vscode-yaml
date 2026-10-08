# Extension API
There are several extension API points implemented that allow third party extensions to have more fine-grained control.

### Register Contributor
The register contributor API allows one to automatically associate YAML files with schemas based off the content that is in the yaml file. The way this works is that a third party extension can register a contributor which has two goals:
1. Identify if the current file is a file that we want to associate with. For example, if you want to associate with kubernetes files you might look to see if the open document contains `apiVersion` and `kind` in it.
2. Return the JSON schema for the file if the current file is a file that we want to associate with.

This allows for more flexibility than having to set it manually through `yaml.schemas` or having to upload the schema to the [json schema store](http://schemastore.org/json/).

An example of this is as follows:
```typescript
const SCHEMA = "myschema";

const schemaJSON = JSON.stringify({
	type: "object",
	properties: {
		version: {
			type: "string",
			description: "A stringy string string",
			enum: [
				"test"
			]
		}
	}
});

function onRequestSchemaURI(resource: string): string | undefined {
	if (resource.endsWith('.yaml')) {
		return `${SCHEMA}://schema/porter`;
	}
	return undefined;
}

function onRequestSchemaContent(schemaUri: string): string | undefined {
	const parsedUri = Uri.parse(schemaUri);
	if (parsedUri.scheme !== SCHEMA) {
		return undefined;
	}
	if (!parsedUri.path || !parsedUri.path.startsWith('/')) {
		return undefined;
	}

	return schemaJSON;
}

const yamlExtensionAPI = await vscode.extensions.getExtension("redhat.vscode-yaml").activate();
yamlExtensionAPI.registerContributor(SCHEMA, onRequestSchemaURI, onRequestSchemaContent);
```

After the contributor is registered, when a completion/hover/validation request is made, the yaml language server will ask the client (VSCode-YAML) if there are any contributors that should be associated with the open file that you are trying to make a request on. If there is then it uses the schema provided by the contributor. It will also use any schemas associated via `yaml.schemas` that associate with the current file as well.

### Schema Modification (New as of 0.7.0)
The schema modification API allows one to modify a schema that is currently in yaml language server memory. Instead of re-inserting your entire schema into the yaml language server, you can make small adjustments to the JSON schema based on your needs.

For example, if you have a simple schema that currently has only one item in the example field:
```JSON
{
    "type":"object",
    "properties":{
       "my_key":{
          "type": "string",
          "examples": [
             "my_test2"
          ]
       }
    }
 }
```

And you want to insert another item into the examples field you can do:

```javascript
const yamlExtensionAPI = await vscode.extensions.getExtension("redhat.vscode-yaml").activate();
yamlExtensionAPI.modifySchemaContent({
    schema: "my_schema_id",
    action: MODIFICATION_ACTIONS.add,
    path: "properties/my_key",
    key: "examples",
    content: [
        "my_test2",
        "my_test1"
    ]
});
```

This will tell VSCode-YAML to make a request to the yaml language server, telling it that the schema in memory with id "my_schema_id" should now have "my_test1" and "my_test2" as their examples. After that request has been made completion/validation/hover all use the new changed schema in memory.

Likewise, if you want to delete a section of the schema you can do that as well.

If we consider the same schema as above, from javascript we can do:

```javascript
const yamlExtensionAPI = await vscode.extensions.getExtension("redhat.vscode-yaml").activate();
yamlExtensionAPI.modifySchemaContent({
    schema: "my_schema_id",
    action: MODIFICATION_ACTIONS.delete,
    path: "properties/my_key",
    key: "examples"
});
```

and it will delete the examples key from the schema.

### Hover Transformer
The hover transformer API allows one to change the hovers of YAML documents before VS Code shows them, for example to render math or diagrams in schema descriptions. A third party extension registers a transformer, which receives each hover after the yaml language server has computed it:

```typescript
const yamlExtensionAPI = await vscode.extensions.getExtension("redhat.vscode-yaml").activate();
context.subscriptions.push(
	yamlExtensionAPI.registerHoverTransformer((hover, document, position, token) => {
		return new vscode.Hover([...hover.contents, new vscode.MarkdownString("*Shown by my extension*")], hover.range);
	})
);
```

A transformer can return a new hover, or return `undefined` to keep the hover it received, which it may have changed in place. If several extensions register transformers, they run in registration order, and each one receives the hover as the previous one left it. A transformer that throws an error is logged to the "YAML Support" output channel and skipped. Transformers are not called when there is no hover or the request is cancelled.

`registerHoverTransformer` returns a disposable that unregisters the transformer. Older versions of VSCode-YAML do not have this API, so check that `yamlExtensionAPI.registerHoverTransformer` exists before calling it.
