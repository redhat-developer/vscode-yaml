

## Developer Support

All contributions are welcome!

### Getting started

1. Install prerequisites:

   * latest [Visual Studio Code](https://code.visualstudio.com/)
   * [Node.js](https://nodejs.org/) v12.0.0 or higher

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

##### Developing the client and server together

1. Download both the [Yaml Language Server](https://github.com/redhat-developer/yaml-language-server) and this VSCode Yaml Client.

2. Create a project with the directories in the following structure.

  ```
  ParentFolder/
            ├──── vscode-yaml/
            ├──── yaml-language-server/
  ```

3. Run `yarn install` in both directories to initialize `node_modules` dependencies.

4. In `vscode-yaml/src/extension.ts` set the `serverModule` variable to:

   ```ts
   serverModule = context.asAbsolutePath(path.join("..", "yaml-language-server", "out", "server", "src", "server.js"));
   ```

   _This will redirect which YAML LS to use._

5. In BOTH directories run:

   ```bash
   yarn run compile
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

* First download the latest *.vsix file from [Github Releases section](https://github.com/redhat-developer/vscode-yaml/releases)
* Inside of VSCode navigate to the extension tab and click the three elipses (...).
* Click install from VSIX and provide the location of the *.vsix that was downloaded
