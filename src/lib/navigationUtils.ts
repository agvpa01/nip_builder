/**
 * Utility functions for handling Ctrl+Shift navigation between table cells
 */

export interface NavigationOptions {
  wrapToNextRow?: boolean; // Whether to move to next row when reaching end of current row (default: true)
  wrapToNextTable?: boolean; // Whether to move to next table when reaching end of current table (default: false)
}

/**
 * Gets all FormattableTableInput elements in the document
 * @returns Array of input elements that are part of FormattableTableInput components
 */
export function getAllTableInputs(): (HTMLInputElement | HTMLElement)[] {
  // Find all input elements that are inside table cells (td elements)
  const inputs = Array.from(
    document.querySelectorAll('td input[type="text"]')
  ) as HTMLInputElement[];

  // Find all contentEditable elements that are inside table cells (FormattableTableInput)
  const contentEditables = Array.from(
    document.querySelectorAll('td div[contenteditable="true"]')
  ) as HTMLElement[];

  // Combine both types and filter to only include enabled inputs
  const allInputs = [...inputs, ...contentEditables];
  return allInputs.filter((input) => {
    if (input instanceof HTMLInputElement) {
      return !input.disabled;
    } else {
      // For contentEditable elements, check if they're not disabled via parent or data attributes
      return input.contentEditable === 'true' && !input.hasAttribute('data-disabled');
    }
  });
}

/**
 * Gets the table row element that contains the given input
 * @param input - The input element
 * @returns The table row element or null if not found
 */
export function getTableRow(
  input: HTMLInputElement | HTMLElement
): HTMLTableRowElement | null {
  return input.closest("tr");
}

/**
 * Gets all input elements within a table row
 * @param row - The table row element
 * @returns Array of input elements in the row
 */
export function getRowInputs(row: HTMLTableRowElement): (HTMLInputElement | HTMLElement)[] {
  const inputs = Array.from(
    row.querySelectorAll('input[type="text"]')
  ) as HTMLInputElement[];
  
  const contentEditables = Array.from(
    row.querySelectorAll('div[contenteditable="true"]')
  ) as HTMLElement[];
  
  const allInputs = [...inputs, ...contentEditables];
  return allInputs.filter((input) => {
    if (input instanceof HTMLInputElement) {
      return !input.disabled;
    } else {
      return input.contentEditable === 'true' && !input.hasAttribute('data-disabled');
    }
  });
}

/**
 * Gets the table element that contains the given input
 * @param input - The input element
 * @returns The table element or null if not found
 */
export function getTable(input: HTMLInputElement | HTMLElement): HTMLTableElement | null {
  return input.closest("table");
}

/**
 * Gets all input elements within a table
 * @param table - The table element
 * @returns Array of input elements in the table
 */
export function getTableInputs(table: HTMLTableElement): (HTMLInputElement | HTMLElement)[] {
  const inputs = Array.from(
    table.querySelectorAll('input[type="text"]')
  ) as HTMLInputElement[];
  
  const contentEditables = Array.from(
    table.querySelectorAll('div[contenteditable="true"]')
  ) as HTMLElement[];
  
  const allInputs = [...inputs, ...contentEditables];
  return allInputs.filter((input) => {
    if (input instanceof HTMLInputElement) {
      return !input.disabled;
    } else {
      return input.contentEditable === 'true' && !input.hasAttribute('data-disabled');
    }
  });
}

/**
 * Finds the next input element to navigate to
 * @param currentInput - The currently focused input element
 * @param direction - Navigation direction ('next' or 'previous')
 * @param options - Navigation options
 * @returns The next input element to focus or null if none found
 */
export function findNextInput(
  currentInput: HTMLInputElement | HTMLElement,
  direction: "next" | "previous",
  options: NavigationOptions = {}
): HTMLInputElement | HTMLElement | null {
  const { wrapToNextRow = true, wrapToNextTable = false } = options;

  const currentRow = getTableRow(currentInput);
  if (!currentRow) return null;

  const currentTable = getTable(currentInput);
  if (!currentTable) return null;

  const rowInputs = getRowInputs(currentRow);
  const currentIndex = rowInputs.indexOf(currentInput);

  if (direction === "next") {
    // Try to find next input in current row
    if (currentIndex < rowInputs.length - 1) {
      return rowInputs[currentIndex + 1];
    }

    // If at end of row and wrapping is enabled, move to next row
    if (wrapToNextRow) {
      const nextRowInput = findNextRowInput(currentRow, "next");
      if (nextRowInput) return nextRowInput;

      // If at end of table and wrapping to next table is enabled
      if (wrapToNextTable) {
        return findNextTableInput(currentTable, "next");
      }
    }
  } else {
    // Try to find previous input in current row
    if (currentIndex > 0) {
      return rowInputs[currentIndex - 1];
    }

    // If at beginning of row and wrapping is enabled, move to previous row
    if (wrapToNextRow) {
      const prevRowInput = findNextRowInput(currentRow, "previous");
      if (prevRowInput) return prevRowInput;

      // If at beginning of table and wrapping to previous table is enabled
      if (wrapToNextTable) {
        return findNextTableInput(currentTable, "previous");
      }
    }
  }

  return null;
}

/**
 * Finds the first input in the next or previous row
 * @param currentRow - The current table row
 * @param direction - Navigation direction
 * @returns The first input in the target row or null if none found
 */
function findNextRowInput(
  currentRow: HTMLTableRowElement,
  direction: "next" | "previous"
): HTMLInputElement | HTMLElement | null {
  const table = currentRow.closest("table");
  if (!table) return null;

  const rows = Array.from(
    table.querySelectorAll("tbody tr")
  ) as HTMLTableRowElement[];
  const currentRowIndex = rows.indexOf(currentRow);

  if (direction === "next") {
    // Find next row with inputs
    for (let i = currentRowIndex + 1; i < rows.length; i++) {
      const rowInputs = getRowInputs(rows[i]);
      if (rowInputs.length > 0) {
        return rowInputs[0]; // Return first input in the row
      }
    }
  } else {
    // Find previous row with inputs
    for (let i = currentRowIndex - 1; i >= 0; i--) {
      const rowInputs = getRowInputs(rows[i]);
      if (rowInputs.length > 0) {
        return rowInputs[rowInputs.length - 1]; // Return last input in the row
      }
    }
  }

  return null;
}

/**
 * Finds the first input in the next or previous table
 * @param currentTable - The current table
 * @param direction - Navigation direction
 * @returns The first input in the target table or null if none found
 */
function findNextTableInput(
  currentTable: HTMLTableElement,
  direction: "next" | "previous"
): HTMLInputElement | HTMLElement | null {
  const allTables = Array.from(
    document.querySelectorAll("table")
  ) as HTMLTableElement[];
  const currentTableIndex = allTables.indexOf(currentTable);

  if (direction === "next") {
    // Find next table with inputs
    for (let i = currentTableIndex + 1; i < allTables.length; i++) {
      const tableInputs = getTableInputs(allTables[i]);
      if (tableInputs.length > 0) {
        return tableInputs[0]; // Return first input in the table
      }
    }
  } else {
    // Find previous table with inputs
    for (let i = currentTableIndex - 1; i >= 0; i--) {
      const tableInputs = getTableInputs(allTables[i]);
      if (tableInputs.length > 0) {
        return tableInputs[tableInputs.length - 1]; // Return last input in the table
      }
    }
  }

  return null;
}

/**
 * Handles Shift+Tab and Ctrl+Shift+Tab navigation key press
 * @param event - The keyboard event
 * @param options - Navigation options
 * @returns Whether the event was handled
 */
export function handleNavigationKeyPress(
  event: KeyboardEvent,
  options: NavigationOptions = {}
): boolean {
  const target = event.target as HTMLInputElement | HTMLElement;
  if (!target) {
    return false;
  }

  // Check if it's a valid input element (either input[type="text"] or contentEditable)
  const isTextInput = target.tagName === "INPUT" && (target as HTMLInputElement).type === "text";
  const isContentEditable = target.contentEditable === "true";
  
  if (!isTextInput && !isContentEditable) {
    return false;
  }

  // Check if the input is inside a table cell
  const tableCell = target.closest("td");
  if (!tableCell) {
    return false;
  }

  let nextInput: HTMLInputElement | HTMLElement | null = null;

  // Handle Shift+Tab (forward navigation) and Ctrl+Shift+Tab (backward navigation)
  if (event.key === "Tab" && event.shiftKey && !event.altKey) {
    if (event.ctrlKey) {
      // Ctrl+Shift+Tab: Navigate backwards
      nextInput = findNextInput(target, "previous", options);
    } else {
      // Shift+Tab: Navigate forwards
      nextInput = findNextInput(target, "next", options);
    }

    if (nextInput) {
      event.preventDefault();
      event.stopPropagation();

      // Focus the next input
      nextInput.focus();
      
      // Select all text based on input type
      if (nextInput instanceof HTMLInputElement) {
        nextInput.select();
      } else {
        // For contentEditable elements, select all content
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          const range = document.createRange();
          range.selectNodeContents(nextInput);
          selection.addRange(range);
        }
      }

      return true;
    }
  }

  return false;
}

/**
 * Sets up global navigation event listener
 * @param options - Navigation options
 * @returns Cleanup function to remove the event listener
 */
export function setupGlobalNavigation(
  options: NavigationOptions = {}
): () => void {
  const handleKeyDown = (event: KeyboardEvent) => {
    handleNavigationKeyPress(event, options);
  };

  document.addEventListener("keydown", handleKeyDown, true);

  return () => {
    document.removeEventListener("keydown", handleKeyDown, true);
  };
}

/**
 * Gets navigation information for debugging
 * @param input - The input element to analyze
 * @returns Navigation information object
 */
export function getNavigationInfo(input: HTMLInputElement | HTMLElement) {
  const row = getTableRow(input);
  const table = getTable(input);
  const rowInputs = row ? getRowInputs(row) : [];
  const tableInputs = table ? getTableInputs(table) : [];
  const allInputs = getAllTableInputs();

  return {
    currentInput: input,
    row,
    table,
    rowInputs,
    tableInputs,
    allInputs,
    currentRowIndex: rowInputs.indexOf(input),
    currentTableIndex: tableInputs.indexOf(input),
    currentGlobalIndex: allInputs.indexOf(input),
  };
}
