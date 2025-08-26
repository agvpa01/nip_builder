/**
 * Utility functions for handling tab insertion and navigation in table cells
 */

export interface TabOptions {
  tabSize?: number; // Number of spaces per tab (default: 4)
  preserveFormatting?: boolean; // Whether to preserve existing HTML formatting (default: true)
}

/**
 * Inserts a tab character (represented as spaces) at the current cursor position
 * @param input - The input element
 * @param value - Current value of the input
 * @param onChange - Function to call when value changes
 * @param options - Tab configuration options
 */
export function insertTab(
  input: HTMLInputElement,
  value: string,
  onChange: (newValue: string) => void,
  options: TabOptions = {}
): void {
  const { tabSize = 4, preserveFormatting = true } = options;

  const start = input.selectionStart || 0;
  const end = input.selectionEnd || 0;

  // Create tab string (spaces)
  const tabString = " ".repeat(tabSize);

  // If preserving formatting, work with display value (without HTML tags)
  let workingValue = value;
  let htmlPrefix = "";
  let htmlSuffix = "";

  if (preserveFormatting) {
    // Extract HTML formatting
    const htmlMatch = value.match(/^(<[^>]+>)?(.*?)(<\/[^>]+>)?$/);
    if (htmlMatch) {
      htmlPrefix = htmlMatch[1] || "";
      workingValue = htmlMatch[2] || value;
      htmlSuffix = htmlMatch[3] || "";
    }
  }

  // Insert tab at cursor position
  const beforeCursor = workingValue.substring(0, start - htmlPrefix.length);
  const afterCursor = workingValue.substring(end - htmlPrefix.length);
  const newWorkingValue = beforeCursor + tabString + afterCursor;

  // Reconstruct with formatting if needed
  const newValue = preserveFormatting
    ? htmlPrefix + newWorkingValue + htmlSuffix
    : newWorkingValue;

  onChange(newValue);

  // Set cursor position after the inserted tab
  setTimeout(() => {
    const newCursorPos = start + tabString.length;
    input.setSelectionRange(newCursorPos, newCursorPos);
    input.focus();
  }, 0);
}

/**
 * Handles keyboard navigation for tab functionality
 * @param event - The keyboard event
 * @param input - The input element
 * @param value - Current value of the input
 * @param onChange - Function to call when value changes
 * @param options - Tab configuration options
 * @returns true if the event was handled, false otherwise
 */
export function handleTabKeyPress(
  event: React.KeyboardEvent<HTMLInputElement>,
  input: HTMLInputElement,
  value: string,
  onChange: (newValue: string) => void,
  options: TabOptions = {}
): boolean {
  if (event.key === "Tab" && !event.shiftKey) {
    event.preventDefault();
    insertTab(input, value, onChange, options);
    return true;
  }

  // Handle Shift+Tab for removing tabs (outdent)
  if (event.key === "Tab" && event.shiftKey) {
    event.preventDefault();
    removeTab(input, value, onChange, options);
    return true;
  }

  return false;
}

/**
 * Removes a tab (or spaces equivalent to a tab) from the current cursor position
 * @param input - The input element
 * @param value - Current value of the input
 * @param onChange - Function to call when value changes
 * @param options - Tab configuration options
 */
export function removeTab(
  input: HTMLInputElement,
  value: string,
  onChange: (newValue: string) => void,
  options: TabOptions = {}
): void {
  const { tabSize = 4, preserveFormatting = true } = options;

  const start = input.selectionStart || 0;
  const end = input.selectionEnd || 0;

  // If preserving formatting, work with display value (without HTML tags)
  let workingValue = value;
  let htmlPrefix = "";
  let htmlSuffix = "";

  if (preserveFormatting) {
    // Extract HTML formatting
    const htmlMatch = value.match(/^(<[^>]+>)?(.*?)(<\/[^>]+>)?$/);
    if (htmlMatch) {
      htmlPrefix = htmlMatch[1] || "";
      workingValue = htmlMatch[2] || value;
      htmlSuffix = htmlMatch[3] || "";
    }
  }

  const adjustedStart = start - htmlPrefix.length;
  const adjustedEnd = end - htmlPrefix.length;

  // Look for spaces to remove before cursor
  const beforeCursor = workingValue.substring(0, adjustedStart);
  const afterCursor = workingValue.substring(adjustedEnd);

  // Count trailing spaces before cursor
  const trailingSpaces = beforeCursor.match(/ +$/);
  const spacesToRemove = trailingSpaces
    ? Math.min(trailingSpaces[0].length, tabSize)
    : 0;

  if (spacesToRemove > 0) {
    const newBeforeCursor = beforeCursor.substring(
      0,
      beforeCursor.length - spacesToRemove
    );
    const newWorkingValue = newBeforeCursor + afterCursor;

    // Reconstruct with formatting if needed
    const newValue = preserveFormatting
      ? htmlPrefix + newWorkingValue + htmlSuffix
      : newWorkingValue;

    onChange(newValue);

    // Set cursor position after removing spaces
    setTimeout(() => {
      const newCursorPos = start - spacesToRemove;
      input.setSelectionRange(newCursorPos, newCursorPos);
      input.focus();
    }, 0);
  }
}

/**
 * Converts tab characters to spaces for HTML output
 * @param text - Text that may contain tab spacing
 * @param tabSize - Number of spaces per tab (default: 4)
 * @returns Text with proper spacing for HTML rendering
 */
export function convertTabsForHtml(text: string, tabSize: number = 4): string {
  // Replace multiple spaces with non-breaking spaces to preserve formatting in HTML
  return text.replace(/ {2,}/g, (match) => {
    // Convert to non-breaking spaces, but keep the last space as regular space
    // This helps with text wrapping while preserving indentation
    const nbspCount = match.length - 1;
    return "&nbsp;".repeat(nbspCount) + " ";
  });
}

/**
 * Converts WYSIWYG formatting tags to proper HTML tags for final output
 * @param text - Text that may contain <b> and <i> tags from WYSIWYG editor
 * @returns Text with proper HTML formatting tags
 */
export function convertFormattingForHtml(text: string): string {
  return text
    .replace(/<b>/g, "<strong>")
    .replace(/<\/b>/g, "</strong>")
    .replace(/<i>/g, "<em>")
    .replace(/<\/i>/g, "</em>");
}

/**
 * Extracts display text from formatted text (removes HTML tags)
 * @param formattedText - Text that may contain HTML formatting
 * @returns Plain text without HTML tags
 */
export function getDisplayText(formattedText: string): string {
  return formattedText.replace(/<\/?[bi]>/g, "");
}

/**
 * Preserves tab formatting when applying text formatting (bold/italic)
 * @param text - Original text with potential tab spacing
 * @param format - Format to apply ('b' for bold, 'i' for italic)
 * @param selectionStart - Start of text selection
 * @param selectionEnd - End of text selection
 * @returns Formatted text with preserved tab spacing
 */
export function applyFormattingWithTabs(
  text: string,
  format: "b" | "i",
  selectionStart: number,
  selectionEnd: number
): string {
  const displayText = getDisplayText(text);

  if (selectionStart === selectionEnd) {
    // No selection - format entire text
    const isAlreadyFormatted =
      text.includes(`<${format}>`) && text.includes(`</${format}>`);

    if (isAlreadyFormatted) {
      // Remove formatting
      return text.replace(new RegExp(`<\/?${format}>`, "g"), "");
    } else {
      // Apply formatting to display text
      return `<${format}>${displayText}</${format}>`;
    }
  } else {
    // Format selected text
    const beforeSelection = displayText.substring(0, selectionStart);
    const selectedText = displayText.substring(selectionStart, selectionEnd);
    const afterSelection = displayText.substring(selectionEnd);

    const formattedText = `<${format}>${selectedText}</${format}>`;
    return beforeSelection + formattedText + afterSelection;
  }
}
