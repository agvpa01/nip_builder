import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TextSection {
  id: string;
  title: string;
  content: string;
  isCustom: boolean;
}

interface DraggableTextSectionProps {
  sections: TextSection[];
  onSectionsReorder: (sections: TextSection[]) => void;
  onUpdateSection: (
    id: string,
    field: "title" | "content",
    value: string
  ) => void;
  onDeleteSection: (id: string) => void;
  onTextSelect?: (sectionId: string, element: HTMLTextAreaElement) => void;
}

interface SortableItemProps {
  section: TextSection;
  onUpdateSection: (
    id: string,
    field: "title" | "content",
    value: string
  ) => void;
  onDeleteSection: (id: string) => void;
  onTextSelect?: (sectionId: string, element: HTMLTextAreaElement) => void;
}

function SortableItem({
  section,
  onUpdateSection,
  onDeleteSection,
  onTextSelect,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-gray-200 rounded p-4 bg-white ${
        isDragging ? "shadow-lg" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 mr-2"
          title="Drag to reorder"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M3 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM3 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM3 10a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM3 12a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM7 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM7 8a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM7 10a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM7 12a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" />
          </svg>
        </div>

        <input
          type="text"
          value={section.title}
          onChange={(e) => onUpdateSection(section.id, "title", e.target.value)}
          className="font-semibold text-sm bg-transparent border-none outline-none flex-1"
        />

        <button
          onClick={() => onDeleteSection(section.id)}
          className="text-red-500 hover:text-red-700 text-sm ml-2"
          title="Delete section"
        >
          Delete
        </button>
      </div>

      <textarea
        value={section.content}
        onChange={(e) => onUpdateSection(section.id, "content", e.target.value)}
        onSelect={(e) => {
          if (onTextSelect) {
            onTextSelect(section.id, e.target as HTMLTextAreaElement);
          }
        }}
        className="w-full h-24 text-sm border border-gray-300 rounded p-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder="Enter section content..."
      />
    </div>
  );
}

export function DraggableTextSection({
  sections,
  onSectionsReorder,
  onUpdateSection,
  onDeleteSection,
  onTextSelect,
}: DraggableTextSectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = sections.findIndex(
        (section) => section.id === active.id
      );
      const newIndex = sections.findIndex((section) => section.id === over?.id);

      const reorderedSections = arrayMove(sections, oldIndex, newIndex);
      onSectionsReorder(reorderedSections);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={sections.map((s) => s.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-4">
          {sections.map((section) => (
            <SortableItem
              key={section.id}
              section={section}
              onUpdateSection={onUpdateSection}
              onDeleteSection={onDeleteSection}
              onTextSelect={onTextSelect}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
