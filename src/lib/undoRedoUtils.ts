export interface UndoRedoState {
  history: string[];
  currentIndex: number;
  maxHistorySize: number;
}

// Create a new undo/redo state
export function createUndoRedoState(
  initialValue: string = "",
  maxHistorySize: number = 50
): UndoRedoState {
  return {
    history: [initialValue],
    currentIndex: 0,
    maxHistorySize,
  };
}

// Add a new value to the history
export function addToHistory(
  state: UndoRedoState,
  value: string
): UndoRedoState {
  // Don't add if the value is the same as the current one
  if (state.history[state.currentIndex] === value) {
    return state;
  }

  // Remove any history after the current index (when adding after undo)
  const newHistory = state.history.slice(0, state.currentIndex + 1);

  // Add the new value
  newHistory.push(value);

  // Limit history size
  if (newHistory.length > state.maxHistorySize) {
    newHistory.shift();
  }

  return {
    ...state,
    history: newHistory,
    currentIndex: newHistory.length - 1,
  };
}

// Undo operation
export function undo(state: UndoRedoState): {
  newState: UndoRedoState;
  value: string | null;
} {
  if (state.currentIndex <= 0) {
    return { newState: state, value: null };
  }

  const newIndex = state.currentIndex - 1;
  return {
    newState: {
      ...state,
      currentIndex: newIndex,
    },
    value: state.history[newIndex],
  };
}

// Redo operation
export function redo(state: UndoRedoState): {
  newState: UndoRedoState;
  value: string | null;
} {
  if (state.currentIndex >= state.history.length - 1) {
    return { newState: state, value: null };
  }

  const newIndex = state.currentIndex + 1;
  return {
    newState: {
      ...state,
      currentIndex: newIndex,
    },
    value: state.history[newIndex],
  };
}

// Check if undo is available
export function canUndo(state: UndoRedoState): boolean {
  return state.currentIndex > 0;
}

// Check if redo is available
export function canRedo(state: UndoRedoState): boolean {
  return state.currentIndex < state.history.length - 1;
}

// Handle undo/redo keyboard shortcuts
export function handleUndoRedoKeyPress(
  event: KeyboardEvent,
  undoCallback: () => void,
  redoCallback: () => void
): boolean {
  // Ctrl+Z for undo
  if (event.ctrlKey && event.key === "z" && !event.shiftKey) {
    event.preventDefault();
    undoCallback();
    return true;
  }

  // Ctrl+Shift+Z for redo
  if (event.ctrlKey && event.shiftKey && event.key === "Z") {
    event.preventDefault();
    redoCallback();
    return true;
  }

  return false;
}
