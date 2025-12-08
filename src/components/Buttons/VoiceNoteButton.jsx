import React from "react";
import PropTypes from "prop-types";
import classNames from "classnames";
import { prefix } from "../settings";
import Button from "./Button";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMicrophone } from "@fortawesome/free-solid-svg-icons/faMicrophone";
import { faPaperclip } from "@fortawesome/free-solid-svg-icons/faPaperclip";

export const VoiceNoteButton = ({ className, children, ...rest }) => {
  const cName = `${prefix}-button--voice-note`;

  return (
    <Button
      {...rest}
      className={classNames(cName, className)}
      icon={<FontAwesomeIcon icon={faMicrophone} />}
    >
      {children}
    </Button>
  );
};

VoiceNoteButton.propTypes = {
  /** Primary content. */
  children: PropTypes.node,

  /** Additional classes. */
  className: PropTypes.string,
};

VoiceNoteButton.defaultProps = {
  className: "",
};

export default VoiceNoteButton;
