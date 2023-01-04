import os = require('os');
import path = require('path');
import { StatusBar, By, WebElement } from 'vscode-extension-tester';

/**
 * @author Zbynek Cervinka <zcervink@redhat.com>
 */
export class Utilities {
  public deleteFileInHomeDir(filename: string): void {
    /* eslint-disable */
    const fs = require('fs');
    const homeDir = os.homedir();
    const pathtofile = path.join(homeDir, filename);

    if (fs.existsSync(pathtofile)) {
      fs.rmSync(pathtofile, { recursive: true, force: true });
    }
  }

  public async getSchemaLabel(text: string): Promise<WebElement> | undefined {
    const statusbar = new StatusBar();
    const schemalabel = await statusbar.findElements(By.xpath('.//a[@aria-label="' + text + ', Select JSON Schema"]'));
    return schemalabel[0];
  }
}
