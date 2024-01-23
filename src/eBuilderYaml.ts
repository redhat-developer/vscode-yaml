import { TextDocument } from 'vscode';
import { TelemetryService } from './extension';
import { yamlDocumentsCache } from './languageservice/parser/yaml-documents';
import { matchOffsetToDocument } from './languageservice/utils/arrUtils';

export const isInRootComponentStyle = (document: TextDocument, offset: number, telemetry: TelemetryService): boolean => {
  try {
    const doc = yamlDocumentsCache.getYamlDocument(document as any);
    const currentDoc = matchOffsetToDocument(offset, doc);
    const node = currentDoc.getNodeFromOffset(offset);

    return (
      // only string...
      node.type === 'string' &&
      node.parent?.type === 'property' &&
      // ... 'style' property
      node.parent?.keyNode?.value == 'style' &&
      // ... at root component
      node.parent?.parent?.parent == null
    );
  } catch (error) {
    telemetry.send({
      name: 'eBuilderYaml.isInRootComponentStyle',
      properties: {
        error,
      },
    });

    return false;
  }
};

export const buildRootStyleVirtualContent = (document: TextDocument, offset: number, telemetry: TelemetryService): string => {
  try {
    const doc = yamlDocumentsCache.getYamlDocument(document as any);
    const currentDoc = matchOffsetToDocument(offset, doc);
    const node = currentDoc.getNodeFromOffset(offset, true);
    // we need to + 1 here, since the offset of `node` is offset of `|` character
    const startPositionLine = document.positionAt(node.offset).line + 1;
    const endPositionLine = document.positionAt(node.offset + node.length).line;
    const nodeLines = node.value.toString().split('\n');
    const content = document
      .getText()
      .split('\n')
      .map((line, i) => {
        console.log('line ' + i + ': ' + line);
        if (i >= startPositionLine && i < endPositionLine) {
          return ' '.repeat(2) + nodeLines[i - startPositionLine];
        }

        return ' '.repeat(line.length);
      })
      .join('\n');

    console.log(content);

    return content;
  } catch (error) {
    telemetry.send({
      name: 'eBuilderYaml.isInRootComponentStyle',
      properties: {
        error,
      },
    });

    return document.getText();
  }
};
