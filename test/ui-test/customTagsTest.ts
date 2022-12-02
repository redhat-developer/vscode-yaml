import { expect } from 'chai';
import {
  By,
  WebDriver,
  VSBrowser,
  Key,
  TextEditor,
  Workbench,
  InputBox,
  ContentAssist,
  WebElement,
} from 'vscode-extension-tester';
import { Utilities } from './Utilities';

/**
 * @author Zbynek Cervinka <zcervink@redhat.com>
 */
export function customTagsTest(): void {
  describe("Verify extension's custom tags", () => {
    it('YAML custom tags works as expected', async function () {
      this.timeout(30000);

      let driver: WebDriver = VSBrowser.instance.driver;
      const settingsEditor = await new Workbench().openSettings();
      const setting = await settingsEditor.findSetting('Custom Tags', 'Yaml');
      await setting.findElement(By.className('edit-in-settings-button')).click();

      await delay(2000);
      await driver.actions().sendKeys('    "customTag1"').perform();
      await driver.actions().sendKeys(Key.chord(TextEditor.ctlKey, 's')).perform();

      driver = VSBrowser.instance.driver;
      await driver.actions().sendKeys(Key.F1).perform();

      let input = await InputBox.create();
      await input.setText('>new file');
      await input.confirm();
      await input.confirm();

      await driver.actions().sendKeys(Key.chord(TextEditor.ctlKey, 's')).perform();
      input = await InputBox.create();
      await input.setText('~/kustomization.yaml');
      await input.confirm();

      // wait until the schema is set and prepared
      (await VSBrowser.instance.driver.wait(async () => {
        this.timeout(30000);
        const utils = new Utilities();
        return await utils.getSchemaLabel('kustomization.yaml');
      }, 30000)) as WebElement | undefined;
      await driver.actions().sendKeys('custom').perform();

      const contentAssist: ContentAssist | void = await new TextEditor().toggleContentAssist(true);

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

    afterEach(async function () {
      const utils = new Utilities();
      utils.deleteFileInHomeDir('kustomization.yaml');
    });
  });
}

function delay(milliseconds: number): Promise<number> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
