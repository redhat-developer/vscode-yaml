import { WebDriver, VSBrowser, Key, InputBox, TextEditor, StatusBar, By } from 'vscode-extension-tester';

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

      await delay(10000);

      const statusbar = new StatusBar();
      const schema = await statusbar.findElements(By.xpath('.//a[@aria-label="kustomization.yaml, Select JSON Schema"]'));

      if (schema.length != 1) {
        throw new Error('The appropriate JSON schema has not been selected.');
      }
    });

    afterEach(async function () {
      const { exec } = await require('child_process');
      exec('rm ~/kustomization.yaml');
    });
  });
}

function delay(milliseconds: number): Promise<number> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
