[![CI](https://github.com/redhat-developer/vscode-yaml/workflows/CI/badge.svg)](https://github.com/redhat-developer/vscode-yaml/actions/workflows/CI.yaml)
[![Marketplace Version](https://vsmarketplacebadge.apphb.com/version/redhat.vscode-yaml.svg 'Current Release')](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml)

# YAML Language Support by Red Hat
Provides comprehensive YAML Language support to [Visual Studio Code](https://code.visualstudio.com/), via the [yaml-language-server](https://github.com/redhat-developer/yaml-language-server), with built-in Kubernetes syntax support.

## Features
![screencast](https://raw.githubusercontent.com/redhat-developer/vscode-yaml/main/images/demo.gif)

1. YAML validation:
    * Detects whether the entire file is valid yaml
    * Detects errors such as:
        * Node is not found
        * Node has an invalid key node type
        * Node has an invalid type
        * Node is not a valid child node
2. Document Outlining (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>O</kbd>):
    * Provides the document outlining of all completed nodes in the file
3. Auto completion (<kbd>Ctrl</kbd> + <kbd>Space</kbd>):
    * Auto completes on all commands
    * Scalar nodes autocomplete to schema's defaults if they exist
4. Hover support:
    * Hovering over a node shows description *if provided by schema*
5. Formatter:
   * Allows for formatting the current file
   * On type formatting auto indent for array items

*Auto completion and hover support are provided by the schema. Please refer to Language Server Settings to setup a schema*

## Extension Settings

The following settings are supported:
* `yaml.format.enable`: Enable/disable default YAML formatter (requires restart)
* `yaml.format.singleQuote`: Use single quotes instead of double quotes
* `yaml.format.bracketSpacing`: Print spaces between brackets in objects
* `yaml.format.proseWrap`: Always: wrap prose if it exeeds the print width, Never: never wrap the prose, Preserve: wrap prose as-is
* `yaml.format.printWidth`: Specify the line length that the printer will wrap on
* `yaml.validate`: Enable/disable validation feature
* `yaml.hover`: Enable/disable hover
* `yaml.completion`: Enable/disable autocompletion
* `yaml.schemas`: Helps you associate schemas with files in a glob pattern
* `yaml.schemaStore.enable`: When set to true the YAML language server will pull in all available schemas from [JSON Schema Store](http://schemastore.org/json/)
* `yaml.schemaStore.url`: URL of a schema store catalog to use when downloading schemas.
* `yaml.customTags`: Array of custom tags that the parser will validate against. It has two ways to be used. Either an item in the array is a custom tag such as "!Ref" and it will automatically map !Ref to scalar or you can specify the type of the object !Ref should be e.g. "!Ref sequence". The type of object can be either scalar (for strings and booleans), sequence (for arrays), mapping (for objects).
* `yaml.maxComputedItems`: The maximum number of outline symbols and folding regions computed (limited for performance reasons).
- `[yaml]`: VSCode-YAML adds default configuration for all yaml files. More specifically it converts tabs to spaces to ensure valid yaml, sets the tab size, and allows live typing autocompletion and formatting, also allows code lens. These settings can be modified via the corresponding settings inside the `[yaml]` section in the settings:
  - `editor.tabSize`
  - `editor.formatOnType`
  - `editor.codeLens`

* `http.proxy`: The URL of the proxy server that will be used when attempting to download a schema. If it is not set or it is undefined no proxy server will be used.

- `http.proxyStrictSSL`: If true the proxy server certificate should be verified against the list of supplied CAs. Default is false.

in to your settings.

## Adding custom tags

In order to use the custom tags in your YAML file you need to first specify the custom tags in the setting of your code editor. For example, you can have the following custom tags:

```YAML
"yaml.customTags": [
    "!Scalar-example scalar",
    "!Seq-example sequence",
    "!Mapping-example mapping"
]
```

The !Scalar-example would map to a scalar custom tag, the !Seq-example would map to a sequence custom tag, the !Mapping-example would map to a mapping custom tag.

You can then use the newly defined custom tags inside the YAML file:

```YAML
some_key: !Scalar-example some_value
some_sequence: !Seq-example
  - some_seq_key_1: some_seq_value_1
  - some_seq_key_2: some_seq_value_2
some_mapping: !Mapping-example
  some_mapping_key_1: some_mapping_value_1
  some_mapping_key_2: some_mapping_value_2
```

## Associating schemas

YAML Language support uses [JSON Schemas](https://json-schema.org/) to understand the shape of a YAML file, including its value sets, defaults and descriptions. The schema support is shipped with JSON Schema Draft 7.

We support schemas provided through [JSON Schema Store](http://schemastore.org/json/). However, schemas can also be defined in a workspace.

The association of a YAML file to a schema can be done either in the YAML file itself using a modeline or in the User or Workspace [settings](https://code.visualstudio.com/docs/getstarted/settings) under the property `yaml.schemas`.

### Associating a schema in the YAML file

It is possible to specify a yaml schema using a modeline.

```yaml
# yaml-language-server: $schema=<urlToTheSchema>
```

### Associating a schema to a glob pattern via yaml.schemas:

`yaml.schemas`  applies a schema to a file. In other words, the schema (placed on the left) is applied to the glob pattern on the right. Your schema can be local or online. Your schema must be a relative path and not an absolute path. The entrance point for `yaml.schemas` is location in [user and workspace settings](https://code.visualstudio.com/docs/getstarted/settings#_creating-user-and-workspace-settings)

When associating a schema it should follow the format below
```JSON
"yaml.schemas": {
    "url": "globPattern",
    "Kubernetes": "globPattern"
}
```

e.g.

```json
yaml.schemas: {
    "https://json.schemastore.org/composer": "/*"
}
```

e.g.

```json
yaml.schemas: {
    "kubernetes": "/myYamlFile.yaml"
}
```

e.g.

```json
yaml.schemas: {
    "https://json.schemastore.org/composer": "/*",
    "kubernetes": "/myYamlFile.yaml"
}
```

On Windows with full path:

```json
yaml.schemas: {
    "C:\\Users\\user\\Documents\\custom_schema.json": "someFilePattern.yaml",
}
```

On Mac/Linux with full path:

```json
yaml.schemas: {
    "/home/user/custom_schema.json": "someFilePattern.yaml",
}
```

Since `0.11.0` YAML Schemas can be used for validation:

```json
 "/home/user/custom_schema.yaml": "someFilePattern.yaml"
```

A schema can be associated with multiple globs using a json array, e.g.

```json
yaml.schemas: {
    "kubernetes": ["filePattern1.yaml", "filePattern2.yaml"]
}
```

e.g.

```json
"yaml.schemas": {
    "http://json.schemastore.org/composer": ["/*"],
    "file:///home/johnd/some-schema.json": ["some.yaml"],
    "../relative/path/schema.json": ["/config*.yaml"],
    "/Users/johnd/some-schema.json": ["some.yaml"],
}
```

e.g.

```JSON
"yaml.schemas": {
    "kubernetes": ["/myYamlFile.yaml"]
}
```

e.g.
```json
"yaml.schemas": {
    "http://json.schemastore.org/composer": ["/*"],
    "kubernetes": ["/myYamlFile.yaml"]
}
```

#### Multi root schema association:

You can also use relative paths when working with multi root workspaces.

Suppose you have a multi root workspace that is laid out like:

```shell
My_first_project:
   test.yaml
   my_schema.json
My_second_project:
   test2.yaml
   my_schema2.json
```

You must then associate schemas relative to the root of the multi root workspace project.

```json
yaml.schemas: {
    "My_first_project/my_schema.json": "test.yaml",
    "My_second_project/my_schema2.json": "test2.yaml"
}
```

`yaml.schemas` allows you to specify json schemas that you want to validate against the yaml that you write. *Kubernetes* is a reserved keyword field. It does not require a url as the language server will provide that. You just need the keyword `kubernetes` and a glob pattern.

### Mapping a schema in an extension

- Supports `yamlValidation` point which allows you to contribute a schema for a specific type of yaml file (Similar to [jsonValidation](https://code.visualstudio.com/docs/extensionAPI/extension-points#_contributesjsonvalidation))
e.g.
```JSON
{
  "contributes": {
    "yamlValidation": [
      {
        "fileMatch": "yourfile.yml",
        "url": "./schema.json"
      }
    ]
  }
}
```

## Data and Telemetry

The `vscode-yaml` extension collects anonymous [usage data](USAGE_DATA.md) and sends it to Red Hat servers to help improve our products and services. Read our [privacy statement](https://developers.redhat.com/article/tool-data-collection) to learn more. This extension respects the `redhat.telemetry.enabled` setting which you can learn more about at https://github.com/redhat-developer/vscode-redhat-telemetry#how-to-disable-telemetry-reporting

## How to contribute

The instructions are available in the [contribution guide](CONTRIBUTING.md).
