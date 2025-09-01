/**
 * Utility functions for tab and formatting conversion
 */

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
