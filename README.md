![CI](https://github.com/redhat-developer/vscode-yaml/workflows/CI/badge.svg) [![Build Status](https://travis-ci.org/redhat-developer/yaml-language-server.svg?branch=master)](https://travis-ci.org/redhat-developer/vscode-yaml) [![Marketplace Version](https://vsmarketplacebadge.apphb.com/version/redhat.vscode-yaml.svg 'Current Release')](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml)

# YAML Language Support by Red Hat

Provides comprehensive YAML Language support to [Visual Studio Code](https://code.visualstudio.com/), via the [yaml-language-server](https://github.com/redhat-developer/yaml-language-server), with built-in Kubernetes syntax support.

Supports JSON Schema 7 and below.

## Features

![screencast](https://raw.githubusercontent.com/redhat-developer/vscode-yaml/master/images/demo.gif)

1. YAML validation:
   - Detects whether the entire file is valid yaml
   - Detects errors such as:
     - Node is not found
     - Node has an invalid key node type
     - Node has an invalid type
     - Node is not a valid child node
2. Document Outlining (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>O</kbd>):
   - Provides the document outlining of all completed nodes in the file
3. Auto completion (<kbd>Ctrl</kbd> + <kbd>Space</kbd>):
   - Auto completes on all commands
   - Scalar nodes autocomplete to schema's defaults if they exist
4. Hover support:
   - Hovering over a node shows description _if provided by schema_
5. Formatter:
   - Allows for formatting the current file

_Auto completion and hover support are provided by the schema. Please refer to Language Server Settings to setup a schema_

# Language Server Settings

The following settings are supported:

- `yaml.format.enable`: Enable/disable default YAML formatter (requires restart)
- `yaml.format.singleQuote`: Use single quotes instead of double quotes
- `yaml.format.bracketSpacing`: Print spaces between brackets in objects
- `yaml.format.proseWrap`: Always: wrap prose if it exeeds the print width, Never: never wrap the prose, Preserve: wrap prose as-is
- `yaml.format.printWidth`: Specify the line length that the printer will wrap on
- `yaml.validate`: Enable/disable validation feature
- `yaml.hover`: Enable/disable hover
- `yaml.completion`: Enable/disable autocompletion
- `yaml.schemas`: Helps you associate schemas with files in a glob pattern
- `yaml.schemaStore.enable`: When set to true the YAML language server will pull in all available schemas from [JSON Schema Store](http://schemastore.org/json/)
- `yaml.customTags`: Array of custom tags that the parser will validate against. It has two ways to be used. Either an item in the array is a custom tag such as "!Ref" and it will automatically map !Ref to scalar or you can specify the type of the object !Ref should be e.g. "!Ref sequence". The type of object can be either scalar (for strings and booleans), sequence (for arrays), mapping (for objects).
- `[yaml]`: VSCode-YAML adds default configuration for all yaml files. More specifically it converts tabs to spaces to ensure valid yaml, sets the tab size, and allows live typing autocompletion. These settings can be modified via the corresponding settings inside the `[yaml]` section in the settings:
  - `editor.insertSpaces`
  - `editor.tabSize`
  - `editor.quickSuggestions`

##### Adding custom tags

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

##### Associating a schema to a glob pattern via yaml.schemas:

yaml.schemas applies a schema to a file. In other words, the schema (placed on the left) is applied to the glob pattern on the right. Your schema can be local or online. Your schema must be a relative path and not an absolute path.

When associating a schema it should follow the format below

```JSON
"yaml.schemas": {
    "url": "globPattern",
    "Kubernetes": "globPattern"
}
```

e.g.

```JSON
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

```JSON
"yaml.schemas": {
    "http://json.schemastore.org/composer": ["/*"],
    "kubernetes": ["/myYamlFile.yaml"]
}
```

Since `0.11.0` YAML Schemas can be used for validation:

```json
 "/home/user/custom_schema.yaml": "someFilePattern.yaml"
```

- The entrance point for `yaml.schemas` is location in [user and workspace settings](https://code.visualstudio.com/docs/getstarted/settings#_creating-user-and-workspace-settings)
- Supports schemas through [schema store](http://schemastore.org/json/) as well as any other schema url
- Supports 'yamlValidation' point which allows you to contribute a schema for a specific type of yaml file (Similar to [jsonValidation](https://code.visualstudio.com/docs/extensionAPI/extension-points#_contributesjsonvalidation))
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

This extension allows you to specify json schemas that you want to validate against the yaml that you write. In the vscode user and workspace preferences you can set a url and a glob pattern that you want to validate against the schema. Kubernetes is an optional field. They do not require a url as the language server will provide that. You just need the keyword kubernetes and a glob pattern.

## Developer Support

### Getting started

1. Install prerequisites:
   - latest [Visual Studio Code](https://code.visualstudio.com/)
   - [Node.js](https://nodejs.org/) v6.0.0 or higher
2. Fork and clone this repository and go into the folder
   ```bash
    $ cd vscode-yaml
   ```
3. Install the dependencies
   ```bash
   $ npm install
   ```
4. Compile the Typescript to Javascript
   ```bash
   $ npm run compile
   ```

#### Developing the client side

1. Open the client in vscode
2. Make changes as neccessary and the run the code using F5

#### Developing the client and server together

1. Download both the [Yaml Language Server](https://github.com/redhat-developer/yaml-language-server) and this VSCode Yaml Client.

2. Create a project with the directories in the following structure.

```
ParentFolder/
          ├──── vscode-yaml/
          ├──── yaml-language-server/
```

3. Run `npm install` in both directories to initialize `node_modules` dependencies.
4. In `vscode-yaml/src/extension.ts` set the `serverModule` variable to:

   ```ts
   serverModule = context.asAbsolutePath(path.join('..', 'yaml-language-server', 'out', 'server', 'src', 'server.js'));
   ```

   _This will redirect which YAML LS to use._

5. In BOTH directories run:

   ```bash
   npm run compile
   ```

6. To run the language server in VSCode, click `View -> Debug`, then from the drop down menu beside the green arrow select `Launch Extension (vscode-yaml)`, click the arrow, and a new VSCode window should load with the YAML LS running.

7. To debug the language server in VSCode, from the same drop down menu
   select
   `Attach (yaml-language-server)`, and click the green arrow to start.
   Ensure you've opened a YAML file or else the server would have not yet
   started.

**Note:** Disable or remove any existing implementations of the YAML Language server from VSCode or there will be conflicts.

##### Developing the server side

1. To develop the language server visit https://github.com/redhat-developer/yaml-language-server

Refer to VS Code [documentation](https://code.visualstudio.com/docs/extensions/debugging-extensions) on how to run and debug the extension

### Installation from Github Release

To obtain and install the latest release from github you can:

- First download the latest \*.vsix file from [Github Releases section](https://github.com/redhat-developer/vscode-yaml/releases)
- Inside of VSCode navigate to the extension tab and click the three elipses (...).
- Click install from VSIX and provide the location of the \*.vsix that was downloaded

### Contributing

All contributions are welcome!
