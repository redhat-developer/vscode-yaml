import { extensionUIAssetsTest } from './extensionUITest';
import { contentAssistSuggestionTest } from './contentAssistTest';

describe('VSCode YAML - UI tests', () => {
  extensionUIAssetsTest();
  contentAssistSuggestionTest();
});
