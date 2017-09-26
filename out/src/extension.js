'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
const vscode_languageclient_1 = require("vscode-languageclient");
function activate(context) {
    // The server is implemented in node
    let serverModule = context.extensionPath + '/node_modules/yaml-language-server/out/server/src/server.js';
    // The debug options for the server
    let debugOptions = { execArgv: ["--nolazy", "--debug=6009"] };
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    let serverOptions = {
        run: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc },
        debug: { module: serverModule, transport: vscode_languageclient_1.TransportKind.ipc, options: debugOptions }
    };
    // Options to control the language client
    let clientOptions = {
        // Register the server for plain text documents
        documentSelector: ['yaml'],
        synchronize: {
            // Synchronize the setting section 'languageServerExample' to the server
            configurationSection: 'yaml',
            // Notify the server about file changes to '.clientrc files contain in the workspace
            fileEvents: vscode_1.workspace.createFileSystemWatcher("**/*.yaml")
        }
    };
    // Create the language client and start the client.
    let disposable = new vscode_languageclient_1.LanguageClient('yaml', 'Yaml Support', serverOptions, clientOptions).start();
    // Push the disposable to the context's subscriptions so that the
    // client can be deactivated on extension deactivation
    context.subscriptions.push(disposable);
}
exports.activate = activate;
//# sourceMappingURL=extension.js.map