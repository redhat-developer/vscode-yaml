[![Build Status](https://travis-ci.org/redhat-developer/yaml-language-server.svg?branch=master)](https://travis-ci.org/redhat-developer/vscode-yaml)

# YAML Support for Visual Studio Code
Provides YAML support via [yaml-language-server](https://github.com/redhat-developer/yaml-language-server) with built-in Kubernetes and Kedge syntax support.

## Features
![screencast](https://raw.githubusercontent.com/redhat-developer/vscode-yaml/master/images/demo.gif)

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

*Auto completion and hover support are provided by the schema. Please refer to Language Server Settings to setup a schema*

# Language Server Settings

The following settings are supported:
* `yaml.format.enable`: Enable/disable default YAML formatter (requires restart)
* `yaml.validate`: Enable/disable validation feature
* `yaml.schemas`: Helps you associate schemas with files in a glob pattern
* `[yaml]`: VSCode-YAML adds default configuration for all yaml files. More specifically it converts tabs to spaces to ensure valid yaml, sets the tab size, and allows live typing autocompletion. These settings can be modified via the corresponding settings inside the `[yaml]` section in the settings:
    *   `editor.insertSpaces`
    *   `editor.tabSize`
    *   `editor.quickSuggestions`

##### Associating a schema to a glob pattern via yaml.schemas: 
When associating a schema it should follow the format below
```
yaml.schemas: {
    "url": "globPattern",
    "Kubernetes": "globPattern",
    "kedge": "globPattern"
}
```

e.g.
```
yaml.schemas: {
    "http://json.schemastore.org/composer": "/*"
}
```

e.g.

```
yaml.schemas: {
    "kubernetes": "/myYamlFile.yaml"
}
```
e.g.
```
yaml.schemas: {
    "kedge": "/myKedgeApp.yaml"
}
```

e.g.
```
yaml.schemas: {
    "http://json.schemastore.org/composer": "/*",
    "kubernetes": "/myYamlFile.yaml"
}
```

- The entrance point for `yaml.schemas` is location in [user and workspace settings](https://code.visualstudio.com/docs/getstarted/settings#_creating-user-and-workspace-settings)
- Supports schemas through [schema store](http://schemastore.org/json/) as well as any other schema url
- Supports 'yamlValidation' point which allows you to contribute a schema for a specific type of yaml file (Similar to [jsonValidation](https://code.visualstudio.com/docs/extensionAPI/extension-points#_contributesjsonvalidation))

This extension allows you to specify json schemas that you want to validate against the yaml that you write. In the vscode user and workspace preferences you can set a url and a glob pattern that you want to validate against the schema. Kubernetes and kedge are optional fields. They do not require a url as the language server will provide that. You just need the keywords kubernetes/kedge and a glob pattern.

## Developer Support
### Getting started
1. Install prerequisites:
   * latest [Visual Studio Code](https://code.visualstudio.com/)
   * [Node.js](https://nodejs.org/) v6.0.0 or higher
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

##### Developing the client side
1. Open the client in vscode
2. Make changes as neccessary and the run the code using F5

##### Developing the server side
1. To develop the language server visit https://github.com/redhat-developer/yaml-language-server

Refer to VS Code [documentation](https://code.visualstudio.com/docs/extensions/debugging-extensions) on how to run and debug the extension

### Installation from Github Release
To obtain and install the latest release from github you can:
* First download the latest *.vsix file from [Github Releases section](https://github.com/redhat-developer/vscode-yaml/releases)
* Inside of VSCode navigate to the extension tab and click the three elipses (...).
* Click install from VSIX and provide the location of the *.vsix that was downloaded

### Contributing
All contributions are welcome!
