// Utility functions for drag and drop operations

export interface DragDropHandlers {
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, dropIndex: number) => void;
  onDragEnd: () => void;
}

// Reorder array items based on drag and drop
export function reorderArray<T>(
  array: T[],
  fromIndex: number,
  toIndex: number
): T[] {
  const result = [...array];
  const [removed] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, removed);
  return result;
}

// Create drag and drop handlers for table rows
export function createDragDropHandlers<T>(
  items: T[],
  onReorder: (reorderedItems: T[]) => void,
  draggedIndex: number | null,
  setDraggedIndex: (index: number | null) => void
): DragDropHandlers {
  return {
    onDragStart: (e: React.DragEvent, index: number) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/html", "");

      // Add visual feedback
      const target = e.target as HTMLElement;
      target.style.opacity = "0.5";
    },

    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    },

    onDrop: (e: React.DragEvent, dropIndex: number) => {
      e.preventDefault();

      if (draggedIndex !== null && draggedIndex !== dropIndex) {
        const reorderedItems = reorderArray(items, draggedIndex, dropIndex);
        onReorder(reorderedItems);
      }

      setDraggedIndex(null);
    },

    onDragEnd: () => {
      setDraggedIndex(null);

      // Reset visual feedback
      const draggedElements = document.querySelectorAll('[draggable="true"]');
      draggedElements.forEach((el) => {
        (el as HTMLElement).style.opacity = "1";
      });
    },
  };
}

// Get drag handle styles
export function getDragHandleStyles(isDragging: boolean = false) {
  return {
    cursor: "grab",
    opacity: isDragging ? 0.5 : 1,
    transition: "opacity 0.2s ease",
  };
}

// Get drop zone styles
export function getDropZoneStyles(isDragOver: boolean = false) {
  return {
    backgroundColor: isDragOver ? "#f3f4f6" : "transparent",
    borderColor: isDragOver ? "#3b82f6" : "transparent",
    transition: "all 0.2s ease",
  };
}
