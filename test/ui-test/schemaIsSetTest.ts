import { WebDriver, VSBrowser, Key, InputBox, TextEditor, WebElement } from 'vscode-extension-tester';
import { Utilities } from './Utilities';

/**
 * @author Zbynek Cervinka <zcervink@redhat.com>
 */
export function schemaIsSetTest(): void {
  describe('Verify that the right JSON schema has been selected', () => {
    it('The right JSON schema has been selected', async function () {
      this.timeout(30000);

      const driver: WebDriver = VSBrowser.instance.driver;
      await driver.actions().sendKeys(Key.F1).perform();

      let input = await InputBox.create();
      await input.setText('>new file');
      await input.confirm();
      await input.confirm();

      await driver.actions().sendKeys(Key.chord(TextEditor.ctlKey, 's')).perform();
      input = await InputBox.create();
      await input.setText('~/kustomization.yaml');
      await input.confirm();

      (await VSBrowser.instance.driver.wait(async () => {
        this.timeout(10000);
        const utils = new Utilities();
        return await utils.getSchemaLabel('kustomization.yaml');
      }, 10000)) as WebElement | undefined;
    });

    afterEach(async function () {
      const utils = new Utilities();
      utils.deleteFileInHomeDir('kustomization.yaml');
    });
  });
}
