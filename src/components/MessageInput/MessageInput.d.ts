import type { MouseEvent, ReactElement } from "react";
import type { ChatComponentPropsRef } from "../../types";

export interface MessageInputProps {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  sendOnReturnDisabled?: boolean;
  sendDisabled?: boolean;
  fancyScroll?: boolean;
  activateAfterChange?: boolean;
  autoFocus?: boolean;
  onChange?: (
    innerHtml: string,
    textContent: string,
    innerText: string,
    nodes: NodeList
  ) => void;
  onSend?: (
    innerHtml: string,
    textContent: string,
    innerText: string,
    nodes: NodeList
  ) => void;
  sendButton?: boolean;
  attachButton?: boolean;
  attachDisabled?: boolean;
  onAttachClick?: (evt: MouseEvent<HTMLButtonElement>) => void;
  sendButtonComponent: any;
  useQuill?: boolean;
  getQuillFileIcon?: (fileType: string) => any;
  getQuillFileDeleteIcon?: () => any;
  quillIcons?: any;
  onFileUpload?: (file: File, currentFiles: File[]) => void;
  onFileRemove?: (fileId: string, currentFiles?: File[]) => void;
  autoFocusQuill?: boolean;
}

export declare const MessageInput: (
  props: ChatComponentPropsRef<MessageInputProps, "div">
) => ReactElement;

export default MessageInput;
