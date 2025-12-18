import { expect } from 'chai';
import { YamlConstants } from './common/YAMLConstants';
import {
  ActivityBar,
  ExtensionsViewItem,
  ExtensionsViewSection,
  SideBarView,
  VSBrowser,
  ViewControl,
  WebDriver,
} from 'vscode-extension-tester';

/**
 * @author Ondrej Dockal <odockal@redhat.com>
 */
export function extensionUIAssetsTest(): void {
  describe("Verify extension's base assets available after install", () => {
    let driver: WebDriver;
    let sideBar: SideBarView;
    let view: ViewControl;
    let section: ExtensionsViewSection;
    let yamlItem: ExtensionsViewItem;

    before(async function () {
      this.timeout(40000);
      driver = VSBrowser.instance.driver;
      view = await new ActivityBar().getViewControl('Extensions');
      sideBar = await view.openView();
      await driver.wait(
        async () => !(await sideBar.getContent().hasProgress()),
        10000,
        "Progress bar hasn't been hidden within the timeout"
      );
      // wait a bit for sections to load
      await new Promise((resolve) => setTimeout(resolve, 3000));
      section = await driver.wait(
        async () => {
          try {
            const content = sideBar.getContent();
            try {
              const sec = (await content.getSection('Installed')) as ExtensionsViewSection;
              return sec;
            } catch {
              // ignore and fall back below
            }

            // pick the first available section
            const sections = await content.getSections();
            return (sections?.[0] as ExtensionsViewSection) ?? null;
          } catch {
            return null;
          }
        },
        15000,
        'Could not find extensions section'
      );
      await section.expand();
      yamlItem = await driver.wait(
        async () => {
          return await section.findItem(`@installed ${YamlConstants.YAML_NAME}`);
        },
        10000,
        'There were not visible items available under installed section'
      );
    });

    it('YAML extension is installed', async function () {
      this.timeout(10000);
      expect(yamlItem).not.undefined;
      let author: string;
      let name: string;
      try {
        name = await yamlItem.getTitle();
        author = await yamlItem.getAuthor();
      } catch (error) {
        if ((error as Error).name === 'StaleElementReferenceError') {
          yamlItem = await section.findItem(`@installed ${YamlConstants.YAML_NAME}`);
          name = await yamlItem.getTitle();
          author = await yamlItem.getAuthor();
        }
        throw error;
      }
      expect(name).to.equal(YamlConstants.YAML_NAME);
      expect(author).to.equal('Red Hat');
    });

    after(async () => {
      if (sideBar && (await sideBar.isDisplayed()) && view) {
        await view.closeView();
      }
    });
  });
}
