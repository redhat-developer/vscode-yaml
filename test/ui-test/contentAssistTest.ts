import os = require('os');
import path = require('path');
import { expect } from 'chai';
import { WebDriver, VSBrowser, ContentAssist, EditorView, TextEditor } from 'vscode-extension-tester';
import { createCustomFile, deleteFileInHomeDir, getSchemaLabel } from './util/utility';
/**
 * @author Zbynek Cervinka <zcervink@redhat.com>
 * @author Ondrej Dockal <odockal@redhat.com>
 */
export function contentAssistSuggestionTest(): void {
  describe('Verify content assist suggests right sugestion', () => {
    let driver: WebDriver;
    let editor: TextEditor;
    const yamlFileName = 'kustomization.yaml';
    const homeDir = os.homedir();
    const yamlFilePath = path.join(homeDir, yamlFileName);

    before(async function setup() {
      this.timeout(20000);
      driver = VSBrowser.instance.driver;
      editor = await createCustomFile(yamlFilePath);
      await driver.wait(async () => {
        return await getSchemaLabel(yamlFileName);
      }, 18000);
    });

    it('Content assist suggests right suggestion', async function () {
      this.timeout(15000);
      editor = new TextEditor();
      await editor.setText('api');
      const contentAssist = await editor.toggleContentAssist(true);

      // find if an item with given label is present
      if (contentAssist instanceof ContentAssist) {
        const hasItem = await contentAssist.hasItem('apiVersion');
        if (!hasItem) {
          expect.fail("The 'apiVersion' string did not appear in the content assist's suggestion list.");
        }
      } else {
        expect.fail("The 'apiVersion' string did not appear in the content assist's suggestion list.");
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
