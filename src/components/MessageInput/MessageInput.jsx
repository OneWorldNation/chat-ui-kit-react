import React, {
  useRef,
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
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

const Quill = ReactQuill.Quill;

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

const fileHandler = function () {
  const input = document.createElement("input");
  input.setAttribute("type", "file");
  input.setAttribute("accept", "*");
  input.click();
  input.onchange = () => {
    const file = input.files ? input.files[0] : null;
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const range = this.quill.getSelection(true);
        this.quill.editor.insertEmbed(range.index, "link", reader.result);
        this.quill.setSelection(range.index + 1);
      };
      reader.readAsDataURL(file);
    }
  };
};

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

const quillModules = {
  toolbar: {
    container: [
      [{ font: Font.whitelist }],
      [{ size: ["small", false, "large", "huge"] }],
      ["bold", "italic", "underline", "strike"],
      [{ color: customColors }, { background: customColors }],
      ["link"],
      [{ list: "ordered" }, { list: "bullet" }],
      ["image", "file", "video"],
      ["clean"],
    ],
    handlers: {
      video: videoHandler,
      file: fileHandler,
      color: handleColorChange,
      background: handleBackgroundChange,
    },
  },
};

const quillFormats = [
  "font",
  "size",
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
  "file",
  "video",
];

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
    ...rest
  },
  ref
) {
  const scrollRef = useRef();
  const msgRef = useRef();
  const [stateValue, setStateValue] = useControllableState(value, "");
  const [stateSendDisabled, setStateSendDisabled] = useControllableState(
    sendDisabled,
    true
  );

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

  // Update scroll
  useEffect(() => {
    if (typeof scrollRef.current.updateScroll === "function") {
      scrollRef.current.updateScroll();
    }
  });

  const getContent = () => {
    if (useQuill && msgRef.current && msgRef.current.getEditor) {
      const editor = msgRef.current.getEditor();
      return [
        editor.root.innerHTML,
        editor.getText(),
        editor.root.innerText,
        editor.root.childNodes,
      ];
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

  const send = () => {
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

      onSend(stateValue, content[0], content[1], content[2]);
    }
  };

  const handleKeyPress = (evt) => {
    if (
      evt.key === "Enter" &&
      evt.shiftKey === false &&
      sendOnReturnDisabled === false
    ) {
      evt.preventDefault();
      send();
    }
  };

  const handleChange = (content, delta, source, editor) => {
    if (useQuill) {
      const innerHTML = content;
      const textContent = editor?.getText();
      const innerText = editor?.root?.innerText;
      const childNodes = editor?.root?.childNodes;
      setStateValue(innerHTML);

      if (typeof sendDisabled === "undefined") {
        setStateSendDisabled(!textContent || textContent.trim().length === 0);
      }

      onChange(innerHTML, textContent, innerText, childNodes);
    } else {
      setStateValue(content);

      if (typeof sendDisabled === "undefined") {
        setStateSendDisabled(content.trim().length === 0);
      }

      onChange(content, content, content, []);
    }

    if (typeof scrollRef.current.updateScroll === "function") {
      scrollRef.current.updateScroll();
    }
  };

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
      {useQuill ? (
        <ReactQuill
          ref={msgRef}
          theme="snow"
          value={stateValue}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder={ph}
          readOnly={disabled}
          modules={quillModules}
          formats={quillFormats}
        />
      ) : (
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
      {sendButton === true && (
        <div className={`${cName}__tools`}>
          <SendButton
            onClick={send}
            disabled={disabled === true || stateSendDisabled === true}
          >
            {sendButtonComponent || null}
          </SendButton>
        </div>
      )}
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
};

MessageInputInner.defaultProps = MessageInput.defaultProps;

export { MessageInput };

export default MessageInput;
