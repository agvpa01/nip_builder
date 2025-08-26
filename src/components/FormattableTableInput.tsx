import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  handleTabKeyPress,
  convertTabsForHtml,
  applyFormattingWithTabs,
} from "../lib/tabUtils";
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
  const isUndoRedoOperation = useRef(false);

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

  // Check if text has formatting
  const isBold = value.includes("<b>") && value.includes("</b>");
  const isItalic = value.includes("<i>") && value.includes("</i>");

  // Apply formatting to selected text or entire value
  const applyFormatting = useCallback(
    (tag: "b" | "i") => {
      const input = inputRef.current;
      if (!input) return;

      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;

      // Use the tab-aware formatting function
      const newValue = applyFormattingWithTabs(value, tag, start, end);
      onChange(newValue);

      // Restore focus and selection
      setTimeout(() => {
        input.focus();
        const displayValue = newValue.replace(/<\/?[bi]>/g, "");
        const selectedText = displayValue.substring(start, end);
        if (selectedText) {
          const newStart = start + 3; // Account for opening tag
          const newEnd = newStart + selectedText.length;
          input.setSelectionRange(newStart, newEnd);
        }
      }, 0);
    },
    [value, onChange]
  );

  // Display value without HTML tags for editing
  const displayValue = value.replace(/<\/?[bi]>/g, "");

  return (
    <div className="relative group">
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={(e) => {
          if (disabled) return;

          // Preserve existing formatting when typing
          let newValue = e.target.value;

          // If the original value had formatting, try to preserve it
          if (isBold && !isItalic) {
            newValue = `<b>${newValue}</b>`;
          } else if (isItalic && !isBold) {
            newValue = `<i>${newValue}</i>`;
          } else if (isBold && isItalic) {
            newValue = `<b><i>${newValue}</i></b>`;
          }

          onChange(newValue);
        }}
        onKeyDown={(e) => {
          if (disabled) return;

          const input = inputRef.current;
          if (!input) return;

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

          // Handle tab key press for inserting tabs
          handleTabKeyPress(e, input, value, onChange, {
            tabSize: 4,
            preserveFormatting: true,
          });
        }}
        onFocus={() => !disabled && setShowFormatting(true)}
        onBlur={() => setTimeout(() => setShowFormatting(false), 200)}
        className={`${className} pr-20 ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}`}
        placeholder={placeholder}
        disabled={disabled}
      />

      {/* Formatting buttons */}
      {showFormatting && !disabled && (
        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex gap-1">
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
