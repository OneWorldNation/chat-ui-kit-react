import React, {
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useMemo,
} from "react";
import ReactQuill from "react-quill";
// import "react-quill/dist/quill.snow.css";
// import "../../index.css";
import { noop } from "../utils";
import PropTypes from "prop-types";
import classNames from "classnames";
import { prefix } from "../settings";
import ContentEditable from "../ContentEditable";
import SendButton from "../Buttons/SendButton";
import AttachmentButton from "../Buttons/AttachmentButton";
import PerfectScrollbar from "../Scroll";

function truncateWords(words, maxLength) {
  return words.length > maxLength
    ? `${words.slice(0, maxLength - 3)}...`
    : words;
}

const mimeTypeToShortForm = {
  "text/csv": "CSV",
  "application/pdf": "PDF",
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "text/plain": "TXT",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "DOCX",
  "application/zip": "ZIP",
  "application/x-rar-compressed": "RAR",
  "application/x-7z-compressed": "7Z",
  "application/x-gzip": "GZ",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    "PPT",
  "application/msword": "DOC",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.ms-powerpoint": "PPT",
  "application/vnd.oasis.opendocument.text": "ODT",
  "application/vnd.oasis.opendocument.spreadsheet": "ODS",
  "image/gif": "GIF",
  "image/svg+xml": "SVG",
  "image/tiff": "TIFF",
  "image/bmp": "BMP",
  "image/webp": "WEBP",
  "image/heic": "HEIC",
  "image/heif": "HEIF",
  "image/avif": "AVIF",
  "image/ico": "ICO",
  "image/vnd.microsoft.icon": "ICO",
  "image/x-icon": "ICO",
  "image/vnd.djvu": "DJVU",
  // Add other MIME types and their short forms as needed
};

const convertFileTypeToShortForm = (fileType) => {
  return mimeTypeToShortForm[fileType] || "File";
};

const Quill = ReactQuill.Quill;

const Parchment = Quill.import("parchment");
const SizeStyle = new Parchment.Attributor.Class(
  "size",
  "custom-quill-chat-size",
  {
    scope: Parchment.Scope.INLINE,
    whitelist: ["small", "normal", "large", "huge"], // Custom sizes
  }
);
Quill.register(SizeStyle, true);

const BlockEmbed = Quill.import("blots/block/embed");

class FileBlot extends BlockEmbed {
  static blotName = "file";
  static tagName = "div";
  static className = "ql-file";

  static create(value) {
    const node = super.create();
    node.setAttribute("data-file-name", value.name);
    node.setAttribute("data-file-type", value.type);
    node.setAttribute("data-file-size", value.size);
    node.innerHTML = `
      <strong>${value.name}</strong>
      <div>${value.type}</div>
      <div>${(value.size / 1024 / 1024).toFixed(2)} MB</div>
    `;
    return node;
  }

  static value(node) {
    return {
      name: node.getAttribute("data-file-name"),
      type: node.getAttribute("data-file-type"),
      size: node.getAttribute("data-file-size"),
    };
  }
}

Quill.register(FileBlot);

// Define custom colors including a 'remove' option for removing color
const customColors = [
  "#000000",
  "#e60000",
  "#ff9900",
  "#ffff00",
  "#008a00",
  "#0066cc",
  "#9933ff",
  "#ffffff",
  "#facccc",
  "#ffebcc",
  "#ffffcc",
  "#cce8cc",
  "#cce0f5",
  "#ebd6ff",
  "#bbbbbb",
  "#f06666",
  "#ffc266",
  "#ffff66",
  "#66b966",
  "#66a3e0",
  "#c285ff",
  "#888888",
  "#a10000",
  "#b26b00",
  "#b2b200",
  "#006100",
  "#0047b2",
  "#6b24b2",
  "#444444",
  "#5c0000",
  "#663d00",
  "#666600",
  "#003700",
  "#002966",
  "#3d1466",
  "remove",
];

const Font = Quill.import("formats/font");
Font.whitelist = [
  "arial",
  "comic-sans",
  "courier-new",
  "georgia",
  "helvetica",
  "lucida",
  "times-new-roman",
  "verdana",
];

Quill.register(Font, true);

// Register the custom handlers
const videoHandler = function () {
  const input = document.createElement("input");
  input.setAttribute("type", "file");
  input.setAttribute("accept", "video/*");
  input.click();
  input.onchange = () => {
    const file = input.files ? input.files[0] : null;
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const range = this.quill.getSelection(true);
        this.quill.editor.insertEmbed(range.index, "video", reader.result);
        this.quill.setSelection(range.index + 1);
      };
      reader.readAsDataURL(file);
    }
  };
};

//

const handleColorChange = function (value) {
  const editor = this.quill;
  if (value === "remove") {
    editor.format("color", false);
  } else {
    editor.format("color", value);
  }
};

const handleBackgroundChange = function (value) {
  const editor = this.quill;
  if (value === "remove") {
    editor.format("background", false);
  } else {
    editor.format("background", value);
  }
};

// Because container depends on fancyScroll
// it must be wrapped in additional container
function editorContainer() {
  class Container extends React.Component {
    render() {
      const {
        props: { fancyScroll, children, forwardedRef, ...rest },
      } = this;

      return (
        <>
          {fancyScroll === true && (
            <PerfectScrollbar
              ref={(elRef) => (forwardedRef.current = elRef)}
              {...rest}
              options={{ suppressScrollX: true }}
            >
              {children}
            </PerfectScrollbar>
          )}
          {fancyScroll === false && (
            <div ref={forwardedRef} {...rest}>
              {children}
            </div>
          )}
        </>
      );
    }
  }

  return React.forwardRef((props, ref) => {
    return <Container forwardedRef={ref} {...props} />;
  });
}

const EditorContainer = editorContainer();

const useControllableState = (value, initialValue) => {
  const initial = typeof value !== "undefined" ? value : initialValue;
  const [stateValue, setStateValue] = useState(initial);
  const effectiveValue = typeof value !== "undefined" ? value : stateValue;

  return [
    effectiveValue,
    (newValue) => {
      setStateValue(newValue);
    },
  ];
};

let icons = ReactQuill.Quill.import("ui/icons");

function MessageInputInner(
  {
    value,
    onSend,
    onChange,
    autoFocus,
    placeholder,
    fancyScroll,
    className,
    activateAfterChange,
    disabled,
    sendDisabled,
    sendOnReturnDisabled,
    attachDisabled,
    sendButton,
    attachButton,
    onAttachClick,
    sendButtonComponent,
    useQuill, // Add useQuill prop
    getQuillFileIcon,
    getQuillFileDeleteIcon,
    quillIcons,
    onFileUpload,
    onFileRemove,
    autoFocusQuill,
    customEditor,
    ...rest
  },
  ref
) {
  console.log("MessageInput", value);
  const scrollRef = useRef();
  const msgRef = useRef();
  // const quillRef = useRef < ReactQuill > null;
  const [stateValue, setStateValue] = useControllableState(value, "");
  const [stateSendDisabled, setStateSendDisabled] = useControllableState(
    sendDisabled,
    true
  );
  const [attachedFiles, setAttachedFiles] = useState([]);
  const sendTimeoutRef = useRef(null);

  // Public API
  const focus = () => {
    if (msgRef.current && msgRef.current.focus) {
      msgRef.current.focus();
    }
  };

  // Return object with public Api
  useImperativeHandle(ref, () => ({
    focus,
  }));

  // Set focus
  useEffect(() => {
    if (autoFocus === true) {
      focus();
    }
  }, []);

  // useEffect(() => {
  //   if (msgRef?.current) {
  //     const editor = msgRef?.current?.getEditor();
  //     if (editor && autoFocusQuill) {
  //       editor.focus();
  //     }
  //   }
  // }, [msgRef, autoFocusQuill]);

  // Update scroll
  useEffect(() => {
    if (typeof scrollRef?.current?.updateScroll === "function") {
      scrollRef?.current?.updateScroll();
    }
  });

  const getContent = () => {
    // console.log("getContent ", editor.getContent());
    if (customEditor) {
      // console.log("getContent ", editor.getContent());
      // const editor = msgRef.current;
      return [null, value, null, null];
    } else if (
      msgRef.current &&
      msgRef.current.msgRef &&
      msgRef.current.msgRef.current
    ) {
      const contentEditableRef = msgRef.current.msgRef.current;
      return [
        contentEditableRef.textContent,
        contentEditableRef.innerText,
        contentEditableRef.cloneNode(true).childNodes,
      ];
    }
    return ["", "", "", []];
  };
  console.log("stateValue outside", stateValue);
  const send = () => {
    console.log("stateValue in send", stateValue);
    if (stateValue.length > 0) {
      // Clear input only when it's uncontrolled mode
      if (value === undefined) {
        setStateValue("");
      }

      // Disable send button only when it's uncontrolled mode
      if (typeof sendDisabled === "undefined") {
        setStateSendDisabled(true);
      }

      const content = getContent();
      console.log("content in send", content);
      if (content[1]?.trim().length === 0) {
        return;
      }
      onSend(stateValue, content[0], content[1], content[2]);
    }
  };

  const handleKeyPress = (evt) => {
    if (
      evt.key === "Enter" &&
      evt.shiftKey === false &&
      !sendOnReturnDisabled
    ) {
      evt.preventDefault();
      send();
    }
  };

  const isValueValid = (message) => {
    let parsedMessage;
    // Parse the string into a DOM document
    if (message) {
      const parser = new DOMParser();
      parsedMessage = parser.parseFromString(message, "text/html");
      parsedMessage = parsedMessage?.body?.textContent;
    }
    // Extract the text content
    return parsedMessage?.trim().length > 0 ? true : false;
  };

  useEffect(() => {
    console.log("inside useeffect===>", value, sendDisabled);
    if (customEditor && value?.trim().length > 0 && isValueValid(value)) {
      if (typeof sendDisabled === "undefined") {
        setStateSendDisabled(value.trim().length === 0);
      }
    }
    if (value === undefined || value === null || value === "") {
      if (typeof sendDisabled === "undefined") {
        setStateSendDisabled(true);
      }
    }
    setStateValue(value);
  }, [customEditor, value, sendDisabled, setStateSendDisabled, setStateValue]);

  const handleChange = (content, delta, source, editor) => {
    if (customEditor) {
      // const innerHTML = content;
      // // const textContent = editor?.getText();
      // // const innerText = editor?.root?.innerText;
      // // const childNodes = editor?.root?.childNodes;
      // setStateValue(innerHTML);

      // if (typeof sendDisabled === "undefined") {
      //   setStateSendDisabled(!innerHTML || innerHTML.trim().length === 0);
      // }
      if (value) {
        if (typeof sendDisabled === "undefined") {
          setStateSendDisabled(value.trim().length === 0);
        }
      }
      console.log("handleChange MessageInput", value);
      // onChange(value, null, null, null);
    } else {
      setStateValue(content);

      if (typeof sendDisabled === "undefined") {
        setStateSendDisabled(content.trim().length === 0);
      }

      onChange(content, content, content, []);
    }

    if (typeof scrollRef?.current?.updateScroll === "function") {
      scrollRef?.current?.updateScroll();
    }
  };

  useEffect(() => {
    if (quillIcons && useQuill) {
      icons = quillIcons;
    }
  }, [msgRef, quillIcons, useQuill]);

  // icons.file = ReactDOMServer.renderToStaticMarkup(<AttachDark />);

  const quillModules = useMemo(
    () => ({
      keyboard: {
        bindings: {
          enter: {
            key: 13,
            handler: (range, context) => {
              return false;
            },
          },
        },
      },
      toolbar: {
        container: [
          // [{ font: Font.whitelist }], // font dropdown
          // [{ size: ["small", false, "large", "huge"] }], // Font size
          ["bold", "italic", "underline", "strike"],
          [{ color: customColors }, { background: customColors }], // Text color and highlight
          ["link"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["image"],
          ["clean"],
          // ["file"],
        ],
        handlers: {
          // file: fileHandler,
          color: handleColorChange,
          background: handleBackgroundChange,
        },
      },
    }),
    [icons, quillIcons, handleColorChange, handleBackgroundChange]
  );

  const quillFormats = [
    // "font",
    // "size",
    "bold",
    "italic",
    "underline",
    "strike",
    "color",
    "background",
    "link",
    "list",
    "bullet",
    "image",
    // "video",
  ];

  const cName = `${prefix}-message-input`,
    ph = typeof placeholder === "string" ? placeholder : "";

  return (
    <div
      {...rest}
      className={classNames(
        cName,
        { [`${cName}--disabled`]: disabled },
        className
      )}
    >
      {attachButton === true && (
        <div className={`${cName}__tools`}>
          <AttachmentButton
            onClick={onAttachClick}
            disabled={disabled === true || attachDisabled === true}
          />
        </div>
      )}
      {customEditor ? (
        customEditor
      ) : (
        // <div
        //   style={{
        //     borderRadius: "md",
        //     overflow: "hidden",
        //     display: "flex",
        //     flexDirection: "column",
        //     position: "relative",
        //   }}
        //   // style={{ height: "300px", border: "inherit" }}
        // >
        //   <ReactQuill
        //     ref={msgRef}
        //     theme="snow"
        //     value={stateValue}
        //     onChange={handleChange}
        //     onKeyDown={handleKeyPress}
        //     placeholder={ph}
        //     readOnly={disabled}
        //     modules={quillModules}
        //     formats={quillFormats}
        //   />
        //   <div
        //     id="bottom-container"
        //     style={{
        //       display: "flex",
        //       flexWrap: "wrap",
        //       paddingBottom: "12px",
        //       padding: "12px",
        //       gap: "8px",
        //       maxWidth: "100%",
        //     }}
        //   />
        // </div>
        <div className={`${cName}__content-editor-wrapper`}>
          <EditorContainer
            fancyScroll={fancyScroll}
            ref={scrollRef}
            className={`${cName}__content-editor-container`}
          >
            <ContentEditable
              ref={msgRef}
              className={`${cName}__content-editor`}
              disabled={disabled}
              placeholder={ph}
              onKeyPress={handleKeyPress}
              onChange={handleChange}
              activateAfterChange={activateAfterChange}
              value={stateValue}
            />
          </EditorContainer>
        </div>
      )}
      {/* eslint-disable */}
      {sendButton === true && (
        <div
          className={`${cName}__tools any`}
          style={{
            paddingBottom: useQuill ? 0 : "10px",
          }}
          onClick={
            useQuill
              ? () => {
                  if (msgRef?.current) {
                    const editor = msgRef?.current?.getEditor();
                    if (editor) {
                      editor.focus();
                    }
                  }
                }
              : undefined
          }
        >
          <SendButton
            onClick={send}
            disabled={disabled === true || stateSendDisabled === true}
          >
            {sendButtonComponent || null}
          </SendButton>
        </div>
      )}
      {/* eslint-enable */}
    </div>
  );
}

const MessageInput = forwardRef(MessageInputInner);
MessageInput.displayName = "MessageInput";

MessageInput.propTypes = {
  /** Value. */
  value: PropTypes.string,

  /** Placeholder. */
  placeholder: PropTypes.string,

  /** A input can show it is currently unable to be interacted with. */
  disabled: PropTypes.bool,

  /** Prevent that the input message is sent on a return press */
  sendOnReturnDisabled: PropTypes.bool,

  /** Send button can be disabled.<br>
   * It's state is tracked by component, but it can be forced */
  sendDisabled: PropTypes.bool,

  /**
   * Fancy scroll
   * This property is set in constructor, and is not changing when component update.
   */
  fancyScroll: PropTypes.bool,

  /**
   * Sets focus element and caret at the end of input<br>
   * when value is changed programmatically (e.g) from button click and element is not active
   */
  activateAfterChange: PropTypes.bool,

  /** Set focus after mount. */
  autoFocus: PropTypes.bool,

  /**
   * onChange handler<br>
   * @param {String} innerHtml
   * @param {String} textContent
   * @param {String} innerText
   * @param {NodeList} nodes
   */
  onChange: PropTypes.func,

  /**
   * onSend handler<br>
   * @param {String} innerHtml
   * @param {String} textContent
   * @param {String} innerText
   * @param {NodeList} nodes
   */
  onSend: PropTypes.func,

  /** Additional classes. */
  className: PropTypes.string,

  /** Show send button */
  sendButton: PropTypes.bool,

  /** Show add attachment button */
  attachButton: PropTypes.bool,

  /** Disable add attachment button */
  attachDisabled: PropTypes.bool,

  /**
   * onAttachClick handler
   */
  onAttachClick: PropTypes.func,

  sendButtonComponent: PropTypes.Component,
  useQuill: PropTypes.bool, // Add useQuill prop type
  getQuillFileIcon: PropTypes.func,
  getQuillFileDeleteIcon: PropTypes.func,
  quillIcons: PropTypes.any,
  onFileUpload: PropTypes.func,
  onFileRemove: PropTypes.func,
  autoFocusQuill: PropTypes.bool,
};

MessageInputInner.propTypes = MessageInput.propTypes;

MessageInput.defaultProps = {
  value: undefined,
  placeholder: "",
  disabled: false,
  sendOnReturnDisabled: false,
  fancyScroll: true,
  activateAfterChange: false,
  autoFocus: false,
  sendButton: true,
  attachButton: true,
  attachDisabled: false,
  onAttachClick: noop,
  onChange: noop,
  onSend: noop,
  useQuill: false, // Default to false
  getQuillFileIcon: noop,
  getQuillFileDeleteIcon: noop,
  quillIcons: {},
  onFileUpload: noop,
  onFileRemove: noop,
  autoFocusQuill: false,
  customEditor: undefined,
};

MessageInputInner.defaultProps = MessageInput.defaultProps;

export { MessageInput };

export default MessageInput;
