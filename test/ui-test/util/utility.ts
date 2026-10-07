import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import type { WebElement } from 'vscode-extension-tester';
import { StatusBar, By, InputBox, TextEditor, Workbench } from 'vscode-extension-tester';

/**
 * @author Zbynek Cervinka <zcervink@redhat.com>
 * @author Ondrej Dockal <odockal@redhat.com>
 */

export async function createCustomFile(path: string): Promise<TextEditor> {
  await new Workbench().openCommandPrompt();

  let input = await InputBox.create();
  await input.setText('>new file');
  await input.confirm();
  await input.confirm();
  const editor = new TextEditor();
  await editor.save();
  input = await InputBox.create();
  await input.setText(path);
  await input.confirm();
  return editor;
}

export function deleteFileInHomeDir(filename: string): void {
  const homeDir = os.homedir();
  const pathtofile = path.join(homeDir, filename);

  if (fs.existsSync(pathtofile)) {
    fs.rmSync(pathtofile, { recursive: true, force: true });
  }
}

export async function getSchemaLabel(text: string): Promise<WebElement | undefined> {
  const schemalabel = await new StatusBar().findElements(
    By.xpath('.//a[contains(@aria-label, "' + text + '") and contains(@aria-label, "Select JSON Schema")]')
  );
  return schemalabel[0];
}

export async function hardDelay(milliseconds: number): Promise<number> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
