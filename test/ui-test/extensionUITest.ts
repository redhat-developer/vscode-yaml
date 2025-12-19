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
      this.timeout(100000);
      driver = VSBrowser.instance.driver;
      view = await new ActivityBar().getViewControl('Extensions');
      sideBar = await view.openView();
      await driver.wait(
        async () => !(await sideBar.getContent().hasProgress()),
        30000,
        "Progress bar hasn't been hidden within the timeout"
      );
      // wait a bit for sections to load
      await new Promise((resolve) => setTimeout(resolve, 10000));
      section = await driver.wait(
        async () => {
          try {
            const content = sideBar.getContent();
            const sections = await content.getSections();
            for (const sectionName of ['Installed', 'INSTALLED', 'installed']) {
              try {
                const sec = await content.getSection(sectionName);
                if (sec) return sec as ExtensionsViewSection;
              } catch {
                // try next name
              }
            }
            if (sections.length > 0) {
              return sections[0] as ExtensionsViewSection;
            }
            return null;
          } catch {
            return null;
          }
        },
        40000,
        'Could not find extensions section'
      );
      await section.expand();
      yamlItem = await driver.wait(
        async () => {
          return await section.findItem(`@installed ${YamlConstants.YAML_NAME}`);
        },
        20000,
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

    after(async function () {
      this.timeout(5000);
      if (sideBar && (await sideBar.isDisplayed()) && view) {
        await view.closeView();
      }
    });
  });
}
