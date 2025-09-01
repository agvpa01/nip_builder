import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { convertTabsForHtml } from "../lib/tabUtils";
import { handleNavigationKeyPress } from "../lib/navigationUtils";
import {
  createUndoRedoState,
  addToHistory,
  undo,
  redo,
  handleUndoRedoKeyPress,
  UndoRedoState,
} from "../lib/undoRedoUtils";

interface FormattableTableInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  allowNewLines?: boolean; // allow Enter to insert line breaks
  rowThickness?:
    | "normal"
    | "thick"
    | "medium-thick"
    | "large-thick"
    | "extra-large-thick";
  onThicknessChange?: (
    thickness:
      | "normal"
      | "thick"
      | "medium-thick"
      | "large-thick"
      | "extra-large-thick"
  ) => void;
}

export function FormattableTableInput({
  value,
  onChange,
  className = "",
  placeholder = "",
  disabled = false,
  allowNewLines = false,
  rowThickness = "normal",
  onThicknessChange,
}: FormattableTableInputProps) {
  const [showFormatting, setShowFormatting] = useState(false);
  const [showThickness, setShowThickness] = useState(false);
  const [undoRedoState, setUndoRedoState] = useState<UndoRedoState>(() =>
    createUndoRedoState(value)
  );
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formattingRef = useRef<HTMLDivElement>(null);
  const isUndoRedoOperation = useRef(false);
  const isUserInputRef = useRef(false);

  // Handle dropdown positioning
  useEffect(() => {
    if (showThickness && dropdownRef.current && buttonRef.current) {
      const dropdown = dropdownRef.current;
      const button = buttonRef.current;
      const rect = button.getBoundingClientRect();
      const dropdownRect = dropdown.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;

      // Reset classes
      dropdown.className = dropdown.className.replace(
        /\s*(bottom-full|top-full|left-0|right-0)\s*/g,
        " "
      );

      // Check if dropdown would be cut off at the bottom
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const dropdownHeight = dropdownRect.height || 200; // fallback height

      // Check if dropdown would be cut off at the right
      const spaceRight = viewportWidth - rect.right;
      const dropdownWidth = dropdownRect.width || 144; // fallback width

      // Position vertically (default to above, fallback to below if needed)
      if (spaceAbove < dropdownHeight && spaceBelow > dropdownHeight) {
        dropdown.classList.add("top-full", "mt-1");
        dropdown.classList.remove("bottom-full", "mb-1");
      } else {
        dropdown.classList.add("bottom-full", "mb-1");
        dropdown.classList.remove("top-full", "mt-1");
      }

      // Position horizontally
      if (spaceRight < dropdownWidth) {
        dropdown.classList.add("left-0");
        dropdown.classList.remove("right-0");
      } else {
        dropdown.classList.add("right-0");
        dropdown.classList.remove("left-0");
      }
    }
  }, [showThickness]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        console.log("Click outside detected, closing dropdown");
        setShowThickness(false);
      }
    };

    if (showThickness) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showThickness]);

  // Thickness options
  const thicknessOptions = [
    { value: "normal", label: "Normal", style: "1px" },
    { value: "thick", label: "Thick", style: "2px" },
    { value: "medium-thick", label: "Medium Thick", style: "3px" },
    { value: "large-thick", label: "Large Thick", style: "4px" },
    { value: "extra-large-thick", label: "Extra Large Thick", style: "5px" },
  ] as const;

  // Undo/Redo callbacks
  const handleUndo = useCallback(() => {
    const result = undo(undoRedoState);
    if (result.value !== null) {
      isUndoRedoOperation.current = true;
      setUndoRedoState(result.newState);
      onChange(result.value);
      setTimeout(() => {
        isUndoRedoOperation.current = false;
      }, 0);
    }
  }, [undoRedoState, onChange]);

  const handleRedo = useCallback(() => {
    const result = redo(undoRedoState);
    if (result.value !== null) {
      isUndoRedoOperation.current = true;
      setUndoRedoState(result.newState);
      onChange(result.value);
      setTimeout(() => {
        isUndoRedoOperation.current = false;
      }, 0);
    }
  }, [undoRedoState, onChange]);

  // Update undo/redo history when value changes (but not during undo/redo operations)
  useEffect(() => {
    if (!isUndoRedoOperation.current) {
      setUndoRedoState((prevState: UndoRedoState) =>
        addToHistory(prevState, value)
      );
    }
  }, [value]);

  // Check if current selection or entire text has formatting
  const getFormattingState = useCallback(() => {
    const element = inputRef.current;
    if (!element) return { isBold: false, isItalic: false };

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
      // Check formatting of selected text
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;

      // Check if selection is within formatted elements
      let currentNode: Node | null =
        container.nodeType === Node.TEXT_NODE
          ? container.parentNode
          : container;
      let isBold = false;
      let isItalic = false;

      while (currentNode && currentNode !== element) {
        if (currentNode.nodeType === Node.ELEMENT_NODE) {
          const tagName = (currentNode as Element).tagName.toLowerCase();
          if (tagName === "strong" || tagName === "b") isBold = true;
          if (tagName === "em" || tagName === "i") isItalic = true;
        }
        currentNode = currentNode.parentNode;
      }

      return { isBold, isItalic };
    } else {
      // Check formatting of entire content
      return {
        isBold: value.includes("<b>") && value.includes("</b>"),
        isItalic: value.includes("<i>") && value.includes("</i>"),
      };
    }
  }, [value]);

  const formattingState = getFormattingState();
  const isBold = formattingState.isBold;
  const isItalic = formattingState.isItalic;

  // Convert HTML to display format for contentEditable with enhanced styling
  const getDisplayHtml = useCallback((htmlValue: string) => {
    return htmlValue
      .replace(/\n/g, '<br>')
      .replace(/<b>/g, '<strong style="font-weight: bold;">')
      .replace(/<\/b>/g, '</strong>')
      .replace(/<i>/g, '<em style="font-style: italic;">')
      .replace(/<\/i>/g, '</em>');
  }, []);

  // Convert display format back to storage format
  const convertToStorageFormat = useCallback((displayHtml: string) => {
    return displayHtml
      .replace(/<strong[^>]*>/g, '<b>')
      .replace(/<\/strong>/g, '</b>')
      .replace(/<em[^>]*>/g, '<i>')
      .replace(/<\/em>/g, '</i>')
      // Convert common line break HTML to newlines
      .replace(/<div><br\s*\/?><\/div>/g, '\n')
      .replace(/<div>(.*?)<\/div>/g, '$1\n')
      .replace(/<br\s*\/?>(?!\n)/g, '\n')
      // Clean remaining tags and entities we don't use
      .replace(/&nbsp;/g, ' ')
      .replace(/\r/g, '')
      .trimEnd();
  }, []);

  // Apply formatting to selected text or entire value
  const applyFormatting = useCallback(
    (tag: "b" | "i") => {
      const element = inputRef.current;
      if (!element) return;

      const selection = window.getSelection();
      const currentFormattingState = getFormattingState();
      const isCurrentlyFormatted =
        tag === "b"
          ? currentFormattingState.isBold
          : currentFormattingState.isItalic;

      if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
        // No selection or collapsed selection, format entire content
        const plainText = element.textContent || "";

        let newValue: string;
        if (isCurrentlyFormatted) {
          // Remove formatting from entire content
          const tagRegex = tag === "b" ? /<\/?b>/g : /<\/?i>/g;
          newValue = value.replace(tagRegex, "");
        } else {
          // Add formatting to entire content
          // First remove any existing formatting of this type, then add new
          const tagRegex = tag === "b" ? /<\/?b>/g : /<\/?i>/g;
          const cleanValue = value.replace(tagRegex, "");
          const cleanText = cleanValue.replace(/<\/?[bi]>/g, ""); // Get text without any formatting

          if (tag === "b") {
            // Preserve italic formatting if it exists
            newValue = cleanValue.includes("<i>")
              ? cleanValue.replace(/^(.*)$/, "<b>$1</b>")
              : `<b>${cleanText}</b>`;
          } else {
            // Preserve bold formatting if it exists
            newValue = cleanValue.includes("<b>")
              ? cleanValue.replace(/^(.*)$/, "<i>$1</i>")
              : `<i>${cleanText}</i>`;
          }
        }

        onChange(newValue);
        return;
      }

      // Handle selected text
      const range = selection.getRangeAt(0);
      const selectedText = range.toString();

      if (selectedText) {
        const htmlTag = tag === "b" ? "strong" : "em";

        if (isCurrentlyFormatted) {
          // Remove formatting from selected text
          // Find the formatted parent and unwrap it
          let container = range.commonAncestorContainer;
          if (container.nodeType === Node.TEXT_NODE) {
            container = container.parentNode!;
          }

          // Find the formatting element to remove
          let formatElement: Element | null = null;
          let currentNode: Node | null = container;

          while (currentNode && currentNode !== element) {
            if (currentNode.nodeType === Node.ELEMENT_NODE) {
              const tagName = (currentNode as Element).tagName.toLowerCase();
              if (
                (tag === "b" && (tagName === "strong" || tagName === "b")) ||
                (tag === "i" && (tagName === "em" || tagName === "i"))
              ) {
                formatElement = currentNode as Element;
                break;
              }
            }
            currentNode = currentNode.parentNode;
          }

          if (formatElement) {
            // Replace the formatted element with its text content
            const textNode = document.createTextNode(
              formatElement.textContent || ""
            );
            formatElement.parentNode?.replaceChild(textNode, formatElement);
          }
        } else {
          // Add formatting to selected text
          const contents = range.extractContents();
          const formattedElement = document.createElement(htmlTag);
          formattedElement.appendChild(contents);
          range.insertNode(formattedElement);
        }

        // Update the value
        const newHtml = element.innerHTML;
        const newValue = convertToStorageFormat(newHtml);
        onChange(newValue);

        // Restore focus
        setTimeout(() => {
          element.focus();
        }, 0);
      }
    },
    [value, onChange, getFormattingState, convertToStorageFormat]
  );

  const displayHtml = useMemo(
    () => getDisplayHtml(value),
    [getDisplayHtml, value]
  );

  // Initialize the contentEditable div when component mounts
  useEffect(() => {
    const element = inputRef.current;
    if (element) {
      // Always set the initial HTML to ensure proper formatting
      element.innerHTML = displayHtml;
    }
  }, []);

  // Update contentEditable innerHTML when value changes from external sources (not user input)
  useEffect(() => {
    const element = inputRef.current;
    if (element && !isUserInputRef.current && !isUndoRedoOperation.current) {
      // Store current cursor position
      const selection = window.getSelection();
      let cursorPosition = 0;
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(element);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        cursorPosition = preCaretRange.toString().length;
      }

      // Update innerHTML
      element.innerHTML = displayHtml;

      // Restore cursor position
      if (selection && element.textContent) {
        const textLength = element.textContent.length;
        const targetPosition = Math.min(cursorPosition, textLength);

        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT,
          null
        );

        let currentPosition = 0;
        let targetNode: Node | null = null;
        let targetOffset = 0;

        while (walker.nextNode()) {
          const node = walker.currentNode;
          const nodeLength = node.textContent?.length || 0;

          if (currentPosition + nodeLength >= targetPosition) {
            targetNode = node;
            targetOffset = targetPosition - currentPosition;
            break;
          }

          currentPosition += nodeLength;
        }

        if (targetNode) {
          const range = document.createRange();
          range.setStart(targetNode, targetOffset);
          range.setEnd(targetNode, targetOffset);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      }
    }

    // Reset the flag after processing
    isUserInputRef.current = false;
  }, [displayHtml]);

  return (
    <div className="relative group">
      <div
        ref={inputRef as any}
        contentEditable={!disabled}
        suppressContentEditableWarning={true}
        onInput={(e) => {
          if (disabled) return;

          // Mark this as user input to prevent useEffect from interfering
          isUserInputRef.current = true;

          const target = e.target as HTMLElement;
          const newHtml = target.innerHTML;

          // Convert from HTML to storage format
          const newValue = convertToStorageFormat(newHtml);

          onChange(newValue);
        }}
        onKeyDown={(e) => {
          if (disabled) return;

          const element = inputRef.current;
          if (!element) return;

          // Handle undo/redo shortcuts first
          if (handleUndoRedoKeyPress(e.nativeEvent, handleUndo, handleRedo)) {
            return; // Undo/redo was handled, don't process other keys
          }

          // Handle Shift+Tab and Ctrl+Shift+Tab navigation
          if (
            handleNavigationKeyPress(e.nativeEvent, {
              wrapToNextRow: true,
              wrapToNextTable: false,
            })
          ) {
            return; // Navigation was handled, don't process other keys
          }

          // Handle Enter key for new lines when allowed
          if (e.key === "Enter") {
            if (!allowNewLines) {
              e.preventDefault();
              return;
            }
            e.preventDefault();
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              // Insert a line break
              const br = document.createElement("br");
              range.deleteContents();
              range.insertNode(br);
              // Move cursor after the <br>
              range.setStartAfter(br);
              range.setEndAfter(br);
              selection.removeAllRanges();
              selection.addRange(range);
              // Trigger onChange with updated HTML
              const newHtml = (inputRef.current as any)?.innerHTML || "";
              const newValue = convertToStorageFormat(newHtml);
              onChange(newValue);
            }
            return;
          }

          // Handle tab key press for inserting tabs (text indentation)
          if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey) {
            e.preventDefault();

            // Mark this as user input to prevent useEffect from interfering
            isUserInputRef.current = true;

            // Insert 4 spaces for indentation (better than tab character for display)
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
              const range = selection.getRangeAt(0);
              const indentNode = document.createTextNode("    "); // 4 spaces
              range.deleteContents();
              range.insertNode(indentNode);
              range.setStartAfter(indentNode);
              range.setEndAfter(indentNode);
              selection.removeAllRanges();
              selection.addRange(range);

              // Trigger onChange
              const newHtml = element.innerHTML;
              const newValue = convertToStorageFormat(newHtml);
              onChange(newValue);
            }
          }
        }}
        onFocus={() => !disabled && setShowFormatting(true)}
        onBlur={(e) => {
          if (disabled) return;
          // Only hide formatting if focus is moving outside both the input and formatting buttons
          setTimeout(() => {
            const activeElement = document.activeElement;
            const isWithinInput = inputRef.current?.contains(activeElement);
            const isWithinFormatting =
              formattingRef.current?.contains(activeElement);

            if (!isWithinInput && !isWithinFormatting) {
              setShowFormatting(false);
            }
          }, 0);
        }}
        className={`${className} pr-20 min-h-[1rem] outline-none ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
        style={{
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          overflowWrap: "break-word",
          overflow: "auto",
          lineHeight: "1.2",
          fontFamily: "inherit",
          maxWidth: "100%",
          maxHeight: "200px",
        }}
      />
      {!value && !disabled && (
        <div className="absolute inset-0 pointer-events-none text-gray-400 flex items-center">
          <span className="ml-2">{placeholder}</span>
        </div>
      )}

      {/* Formatting buttons */}
      {showFormatting && !disabled && (
        <div
          ref={formattingRef}
          className="absolute right-1 top-1/2 transform -translate-y-1/2 flex gap-1 z-40"
          onMouseDown={(e) => {
            // Prevent the input from losing focus when clicking formatting buttons
            e.preventDefault();
          }}
        >
          <button
            type="button"
            onClick={() => applyFormatting("b")}
            className={`px-1.5 py-0.5 text-xs font-bold border rounded hover:bg-gray-100 ${
              isBold
                ? "bg-blue-100 border-blue-300 text-blue-700"
                : "bg-white border-gray-300"
            }`}
            title="Bold"
          >
            B
          </button>
          <button
            type="button"
            onClick={() => applyFormatting("i")}
            className={`px-1.5 py-0.5 text-xs italic border rounded hover:bg-gray-100 ${
              isItalic
                ? "bg-blue-100 border-blue-300 text-blue-700"
                : "bg-white border-gray-300"
            }`}
            title="Italic"
          >
            I
          </button>
          {onThicknessChange && (
            <div className="relative">
              <button
                ref={buttonRef}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log(
                    "Thickness button clicked, current state:",
                    showThickness
                  );
                  setShowThickness(!showThickness);
                }}
                className="px-1.5 py-0.5 text-xs border rounded hover:bg-gray-100 bg-white border-gray-300"
                title="Row Thickness"
              >
                ═
              </button>
              {showThickness && (
                <div
                  ref={dropdownRef}
                  className="absolute bottom-full right-0 mb-1 bg-white border border-gray-300 rounded shadow-lg z-50 min-w-36 max-h-48 overflow-y-auto"
                >
                  {thicknessOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log("Thickness option clicked:", option.value);
                        onThicknessChange?.(option.value);
                        setShowThickness(false);
                      }}
                      className={`block w-full text-left px-2 py-1 text-xs hover:bg-gray-100 ${
                        rowThickness === option.value
                          ? "bg-blue-50 text-blue-700"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{option.label}</span>
                        <div
                          className="w-4 h-0 border-b border-gray-800"
                          style={{ borderBottomWidth: option.style }}
                        ></div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
