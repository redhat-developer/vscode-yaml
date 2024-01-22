import { Uri } from 'vscode';

export const isInRootComponentStyle = (docUri: Uri, documentText: string, offset: number): boolean => {
  return true;
};

export const buildRootStyleVirtualContent = (documentText: string, offset: number): string => {
  return `# includes:
#  call-in-progress-modal: /components/call/call-in-progress-modal.yml
#  chat-modal: /components/chat/chat-modal.yml

# style: |
  .connect-widget {
    position: fixed;
    right: 0;
    bottom: 100px;
    display: flex;
    flex-direction: column;
    background: var(--primary-color);
    border-radius: var(--border-radius);
    padding: var(--padding-md);
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    z-index: 10;
    width: 10;

    hr {

      width: 70%;
      opacity: 0.3;
    }
  }
  `;
};
