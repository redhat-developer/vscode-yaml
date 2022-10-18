import { extensionUIAssetsTest } from './extensionUITest';
import { contentAssistSuggestionTest } from './contentAssistTest';
import { customTagsTest } from './customTagsTest';

describe('VSCode YAML - UI tests', () => {
  extensionUIAssetsTest();
  contentAssistSuggestionTest();
  customTagsTest();
});
