import { expect } from 'chai';
import { WebDriver, VSBrowser, Key, InputBox, TextEditor, WebElement } from 'vscode-extension-tester';
import { Utilities } from './Utilities';

/**
 * @author Zbynek Cervinka <zcervink@redhat.com>
 */
export function autocompletionTest(): void {
  describe('Verify autocompletion completes what should be completed', () => {
    it('Autocompletion works as expected', async function () {
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

      // wait until the schema is set and prepared
      (await VSBrowser.instance.driver.wait(async () => {
        this.timeout(10000);
        const utils = new Utilities();
        return await utils.getSchemaLabel('kustomization.yaml');
      }, 10000)) as WebElement | undefined;

      await driver.actions().sendKeys('api').perform();
      await new TextEditor().toggleContentAssist(true);
      await driver.actions().sendKeys(Key.ENTER).perform();

      const editor = new TextEditor();
      const text = await editor.getText();

      if (text != 'apiVersion: ') {
        expect.fail("The 'apiVersion: ' string has not been autocompleted.");
      }
    });

    afterEach(async function () {
      const utils = new Utilities();
      utils.deleteFileInHomeDir('kustomization.yaml');
    });
  });
}
