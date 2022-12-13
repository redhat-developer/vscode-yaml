import { extensionUIAssetsTest } from './extensionUITest';
import { contentAssistSuggestionTest } from './contentAssistTest';
import { customTagsTest } from './customTagsTest';
import { schemaIsSetTest } from './schemaIsSetTest';

describe('VSCode YAML - UI tests', () => {
  extensionUIAssetsTest();
  contentAssistSuggestionTest();
  customTagsTest();
  schemaIsSetTest();
});
