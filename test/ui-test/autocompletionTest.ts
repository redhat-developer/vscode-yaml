import os = require('os');
import path = require('path');
import { expect } from 'chai';
import { WebDriver, Key, TextEditor, EditorView, VSBrowser, ContentAssist } from 'vscode-extension-tester';
import { getSchemaLabel, deleteFileInHomeDir, createCustomFile } from './util/utility';

/**
 * @author Zbynek Cervinka <zcervink@redhat.com>
 * @author Ondrej Dockal <odockal@redhat.com>
 */
export function autocompletionTest(): void {
  describe('Verify autocompletion completes what should be completed', () => {
    let driver: WebDriver;
    const yamlFileName = 'kustomization.yaml';
    const homeDir = os.homedir();
    const yamlFilePath = path.join(homeDir, yamlFileName);
    let editor: TextEditor;

    before(async function setup() {
      this.timeout(20000);
      driver = VSBrowser.instance.driver;
      await createCustomFile(yamlFilePath);
      await driver.wait(async () => {
        return await getSchemaLabel(yamlFileName);
      }, 18000);
    });

    it('Autocompletion works as expected', async function () {
      this.timeout(30000);

      editor = new TextEditor();
      await editor.typeTextAt(1, 1, 'api');
      const contentAssist = (await editor.toggleContentAssist(true)) as ContentAssist;
      if (contentAssist.hasItem('apiVersion')) {
        await (await contentAssist.getItem('apiVersion')).click();
      }
      const text = await editor.getText();

      if (text != 'apiVersion: ') {
        expect.fail("The 'apiVersion: ' string has not been autocompleted.");
      }
    });

    after(async function () {
      this.timeout(5000);
      await editor.save();
      await new EditorView().closeAllEditors();
      deleteFileInHomeDir(yamlFileName);
    });
  });
}
