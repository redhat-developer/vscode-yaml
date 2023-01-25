import os = require('os');
import path = require('path');
import { WebDriver, VSBrowser, EditorView, WebElement } from 'vscode-extension-tester';
import { createCustomFile, deleteFileInHomeDir, getSchemaLabel } from './util/utility';
import { expect } from 'chai';

/**
 * @author Zbynek Cervinka <zcervink@redhat.com>
 * @author Ondrej Dockal <odockal@redhat.com>
 */
export function schemaIsSetTest(): void {
  describe('Verify that the right JSON schema has been selected', () => {
    let driver: WebDriver;
    const yamlFileName = 'kustomization.yaml';
    const homeDir = os.homedir();
    const yamlFilePath = path.join(homeDir, yamlFileName);
    let schema: WebElement;

    before(async function setup() {
      this.timeout(20000);
      driver = VSBrowser.instance.driver;
      await createCustomFile(yamlFilePath);
      schema = await driver.wait(async () => {
        return await getSchemaLabel(yamlFileName);
      }, 18000);
    });

    it('The right JSON schema has been selected', async function () {
      this.timeout(5000);
      expect(schema).not.undefined;
      expect(await schema.getText()).to.include('kustomization');
    });

    after(async function () {
      this.timeout(5000);
      await new EditorView().closeAllEditors();
      deleteFileInHomeDir(yamlFileName);
    });
  });
}
