[![Build Status](https://travis-ci.org/redhat-developer/yaml-language-server.svg?branch=master)](https://travis-ci.org/redhat-developer/vscode-k8s)

# Yaml Language Server for VSCode

## Features 
![screencast](https://github.com/redhat-developer/vscode-k8s/blob/master/images/demo.gif)

1. YAML validation:
    * Detects whether the entire file is valid yaml
2. Validation:
    * Detects errors such as:
        * Node is not found   
        * Node has an invalid key node type
        * Node has an invalid type
        * Node is not a valid child node
    * Detects warnings such as:
        * Node is an additional property of parent
3. Auto completion:
    * Auto completes on all commands
    * Scalar nodes autocomplete to schema's defaults if they exist
4. Hover support:
    * Hovering over a node shows description *if available*

# Language Server Settings
`yaml.schemas`: The entrance point for new schema.
```
yaml.schemas: {
    "url": "globPattern",
    "Kedge": "globPattern",
    "Kubernetes": "globPattern"
}
```

This extension allows you to specify json schemas that you want to validate against the yaml that you write. In the vscode preferences you can set a url and a glob pattern that you want to validate against the schema. Kedge and Kubernetes are optional fields. They do not require a url as the language server will provide that. You just need the key word kedge/kubernetes and a glob pattern.

## Developer Support

### Getting started
1. Install prerequisites:
   * latest [Visual Studio Code](https://code.visualstudio.com/)
   * [Node.js](https://nodejs.org/) v6.0.0 or higher
2. Fork and clone this repository and go into the folder
    ```bash
     $ cd vscode-k8s
    ```
3. Install the dependencies for client
    ```bash
	$ cd client
	$ npm install
	```
4. Install the yaml language server submodule
	```bash
	$ git submodule update --init --recursive
	```

##### Developing the client side
1. Open the client in vscode
2. Make changes as neccessary and the run the code using F5

##### Developing the server side
1. To develop the language server visit https://github.com/redhat-developer/yaml-language-server

Refer to VS Code [documentation](https://code.visualstudio.com/docs/extensions/debugging-extensions) on how to run and debug the extension
