import path = require('path');
import os = require('os');
import { WebDriver, VSBrowser, Key, InputBox, TextEditor, ContentAssist } from 'vscode-extension-tester';

/**
 * @author Zbynek Cervinka <zcervink@redhat.com>
 */
export function contentAssistSuggestionTest(): void {
  describe('Verify content assist suggests right sugestion', () => {
    it('Content assist suggests right sugestion', async function () {
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

      await delay(2000);
      await driver.actions().sendKeys('api').perform();

      const contentAssist: ContentAssist | void = await new TextEditor().toggleContentAssist(true);

      // find if an item with given label is present
      if (contentAssist instanceof ContentAssist) {
        const hasItem = await contentAssist.hasItem('apiVersion');
        if (!hasItem) {
          throw new Error("The 'apiVersion' string did not appear in the content assist's suggestion list.");
        }
      } else {
        throw new Error("The 'apiVersion' string did not appear in the content assist's suggestion list.");
      }
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

function delay(milliseconds: number): Promise<number> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
