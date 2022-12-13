import path = require('path');
import os = require('os');
import { WebDriver, VSBrowser, Key, InputBox, TextEditor, StatusBar, By, WebElement } from 'vscode-extension-tester';

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
        return await getSchemaLabel({ text: 'kustomization.yaml' });
      }, 10000)) as WebElement | undefined;
    });

    afterEach(async function () {
      /* eslint-disable */
      const fs = require('fs');
      const homeDir = os.homedir();
      const pathtofile = path.join(homeDir, 'kustomization.yaml');

      if (fs.existsSync(pathtofile)) {
        fs.rmSync(pathtofile, { recursive: true, force: true });
      }
    });
  });
}

async function getSchemaLabel({ text }: { text: string; }): Promise<WebElement> | undefined  {
  const statusbar = new StatusBar();
  var schemalabel = await statusbar.findElements(By.xpath('.//a[@aria-label="' + text + ', Select JSON Schema"]'));
  return schemalabel[0];
}
