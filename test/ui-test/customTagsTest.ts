import os = require('os');
import path = require('path');
import { expect } from 'chai';
import { By, WebDriver, TextEditor, Workbench, ContentAssist, EditorView, VSBrowser } from 'vscode-extension-tester';
import { createCustomFile, deleteFileInHomeDir, getSchemaLabel, hardDelay } from './util/utility';

/**
 * @author Zbynek Cervinka <zcervink@redhat.com>
 * @author Ondrej Dockal <odockal@redhat.com>
 */
export function customTagsTest(): void {
  describe("Verify extension's custom tags", () => {
    let driver: WebDriver;
    const yamlFileName = 'kustomization.yaml';
    const homeDir = os.homedir();
    const yamlFilePath = path.join(homeDir, yamlFileName);
    let editor: TextEditor;
    let editorView: EditorView;

    before(async function setup() {
      this.timeout(20000);
      driver = VSBrowser.instance.driver;
      editorView = new EditorView();
      await createCustomFile(yamlFilePath);
      await driver.wait(async () => {
        return await getSchemaLabel(yamlFileName);
      }, 18000);
    });

    it('YAML custom tags works as expected', async function () {
      this.timeout(30000);

      const settingsEditor = await new Workbench().openSettings();
      const setting = await settingsEditor.findSetting('Custom Tags', 'Yaml');
      await setting.findElement(By.className('edit-in-settings-button')).click();

      await hardDelay(2000);
      const textSettingsEditor = (await editorView.openEditor('settings.json')) as TextEditor;
      if (process.platform === 'darwin') {
        await driver.actions().sendKeys('    "customTag1"').perform();
      } else {
        const coor = await textSettingsEditor.getCoordinates();
        await textSettingsEditor.typeTextAt(coor[0], coor[1], '    "customTag1"');
      }
      await textSettingsEditor.save();

      editor = (await editorView.openEditor(yamlFileName)) as TextEditor;
      await editor.setText('custom');
      await editor.save();

      const contentAssist = await editor.toggleContentAssist(true);

      // find if an item with given label is present in the content assist
      if (contentAssist instanceof ContentAssist) {
        const hasItem = await contentAssist.hasItem('customTag1');
        if (!hasItem) {
          expect.fail("The 'customTag1' custom tag did not appear in the content assist's suggestion list.");
        }
      } else {
        expect.fail("The 'customTag1' custom tag did not appear in the content assist's suggestion list.");
      }
    });

    after(async function () {
      this.timeout(5000);
      await new EditorView().closeAllEditors();
      deleteFileInHomeDir(yamlFileName);
    });
  });
}
