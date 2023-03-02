

## Developer Support

All contributions are welcome!

### Getting started

1. Install prerequisites:

   * latest [Visual Studio Code](https://code.visualstudio.com/)
   * [Node.js](https://nodejs.org/) v14.0.0 or higher

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

3. Open the `vscode-yaml` folder in VSCode, and then add the `yaml-language-server` project to the workspace using `File -> Add Folder to Workspace...`.

4. Run `yarn install` in both directories to initialize `node_modules` dependencies.

5. To run the language server in VSCode, click `View -> Debug`, then from the drop down menu beside the green arrow select `Launch Extension (vscode-yaml)`, click the arrow, and a new VSCode window should load with the YAML LS running.

6. To debug the language server in VSCode, from the same drop down menu
   select
   `Attach (yaml-language-server)`, and click the green arrow to start.
   Ensure you've opened a YAML file or else the server would have not yet
   started.

**Notes:**
* Disable or remove any existing implementations of the YAML Language server from VSCode or there will be conflicts.
* If you still have issues you can also try changing the debug port for the language server. To do this change the port in the `Attach to server` configuration to another value in `yaml-language-server/.vscode/launch.json`, then change update the port in `debugOptions` (`'--inspect=6009'`) to the new port in the file `vscode-yaml/src/node/yamlClientMain.ts`.

##### Developing the server side

1. To develop the language server visit https://github.com/redhat-developer/yaml-language-server

Refer to VS Code [documentation](https://code.visualstudio.com/docs/extensions/debugging-extensions) on how to run and debug the extension

### Installation from GitHub Release

To obtain and install the latest release from GitHub you can:

* First download the latest *.vsix file from [GitHub Releases section](https://github.com/redhat-developer/vscode-yaml/releases)
* Inside of VSCode navigate to the extension tab and click the three elipses (...).
* Click install from VSIX and provide the location of the *.vsix that was downloaded

### Certificate of Origin

By contributing to this project you agree to the Developer Certificate of
Origin (DCO). This document was created by the Linux Kernel community and is a
simple statement that you, as a contributor, have the legal right to make the
contribution. See the [DCO](DCO) file for details.
