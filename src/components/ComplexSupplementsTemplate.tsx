import React, { useState, useCallback, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { DraggableTextSection } from "./DraggableTextSection";
import { TabbedPreviewModal } from "./TabbedPreviewModal";
import { FormattableTableInput } from "./FormattableTableInput";
import { getThicknessBorderStyle } from "../lib/utils";
import { convertTabsForHtml, convertFormattingForHtml } from "../lib/tabUtils";
import {
  createDragDropHandlers,
  getDragHandleStyles,
} from "../lib/dragDropUtils";

interface ComplexSupplementsTemplateProps {
  product: any;
  variant?: any;
  currentNip: any;
  onSave: (nip: any) => void;
  onCancel: () => void;
}

interface TextSection {
  id: string;
  title: string;
  content: string;
  isCustom: boolean;
}

interface NutritionalRow {
  id: string;
  nutrient: string;
  perServe: string;
  per100g: string;
}

interface IngredientRow {
  id: string;
  ingredient: string;
  amount: string;
  dailyValue: string;
}

export function ComplexSupplementsTemplate({
  product,
  variant,
  currentNip,
  onSave,
  onCancel,
}: ComplexSupplementsTemplateProps) {
  // Variant support
  const [activeVariantId, setActiveVariantId] = useState<string | null>(
    variant?._id || null
  );
  const [showPreview, setShowPreview] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Query NIPs for all variants of this product
  const productNips = useQuery(
    api.nips.getNipsByProduct,
    product ? { productId: product._id } : "skip"
  );

  // Get current variant NIP
  const currentVariantNip = productNips?.find(
    (nip) => nip.variantId === activeVariantId
  );

  // Initialize text sections with only Ingredients
  const [textSections, setTextSections] = useState<TextSection[]>([
    {
      id: "ingredients",
      title: "INGREDIENTS:",
      content:
        "Magnesium Oxide, Calcium Carbonate, <i>Vitamin D3 (Cholecalciferol)</i>, Microcrystalline Cellulose, Magnesium Stearate, Silicon Dioxide.",
      isCustom: false,
    },
  ]);

  // Initialize nutritional information table
  const [nutritionalRows, setNutritionalRows] = useState<NutritionalRow[]>([
    {
      id: "serving-info",
      nutrient: "Serving Size: 1-2 capsules",
      perServe: "Servings per Container: 30-60",
      per100g: "",
    },
    {
      id: "energy-kj",
      nutrient: "Energy (kJ)",
      perServe: "5",
      per100g: "850",
    },
    {
      id: "energy-cal",
      nutrient: "Energy (Cal)",
      perServe: "1",
      per100g: "203",
    },
    {
      id: "protein",
      nutrient: "<i>Protein (g)</i>",
      perServe: "0",
      per100g: "0.5",
    },
    {
      id: "total-fat",
      nutrient: "Total Fat (g)",
      perServe: "0",
      per100g: "0.2",
    },
    {
      id: "saturated-fat",
      nutrient: "Saturated Fat (g)",
      perServe: "0",
      per100g: "0.1",
    },
    {
      id: "total-carbs",
      nutrient: "Total Carbohydrate (g)",
      perServe: "0",
      per100g: "0.8",
    },
    {
      id: "sugars",
      nutrient: "Sugars (g)",
      perServe: "0",
      per100g: "0.1",
    },
    {
      id: "sodium",
      nutrient: "Sodium (mg)",
      perServe: "2",
      per100g: "45",
    },
  ]);

  // Initialize compositional information (ingredient breakdown)
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([
    {
      id: "magnesium",
      ingredient: "Magnesium",
      amount: "200mg",
      dailyValue: "48%",
    },
    {
      id: "calcium",
      ingredient: "Calcium",
      amount: "500mg",
      dailyValue: "63%",
    },
    {
      id: "vitamin-d3",
      ingredient: "Vitamin D3",
      amount: "1000IU",
      dailyValue: "250%",
    },
  ]);

  // Thickness state
  const [nutritionalRowThickness, setNutritionalRowThickness] = useState<
    "normal" | "thick" | "medium-thick" | "large-thick" | "extra-large-thick"
  >("normal");
  const [ingredientRowThickness, setIngredientRowThickness] = useState<
    "normal" | "thick" | "medium-thick" | "large-thick" | "extra-large-thick"
  >("normal");

  // Drag and drop state
  const [draggedNutritionalIndex, setDraggedNutritionalIndex] = useState<
    number | null
  >(null);
  

  // Utility function to get border class based on thickness
  const getBorderClass = (
    thickness:
      | "normal"
      | "thick"
      | "medium-thick"
      | "large-thick"
      | "extra-large-thick"
  ) => {
    switch (thickness) {
      case "normal":
        return "border-b border-gray-400";
      case "thick":
        return "border-b-2 border-gray-600";
      case "medium-thick":
        return "border-b-4 border-gray-700";
      case "large-thick":
        return "border-b-8 border-gray-800";
      case "extra-large-thick":
        return "border-b-8 border-double border-black";
      default:
        return "border-b border-gray-400";
    }
  };

  // Load existing NIP data when variant changes
  useEffect(() => {
    if (currentVariantNip && currentVariantNip.content) {
      try {
        const content = currentVariantNip.content;
        if (content.textSections) setTextSections(content.textSections);
        if (content.nutritionalRows)
          setNutritionalRows(content.nutritionalRows);
        if (content.ingredientRows) setIngredientRows(content.ingredientRows);
        if (content.nutritionalRowThickness)
          setNutritionalRowThickness(content.nutritionalRowThickness);
        if (content.ingredientRowThickness)
          setIngredientRowThickness(content.ingredientRowThickness);
      } catch (error) {
        console.error("Error loading NIP content:", error);
      }
    }
  }, [currentVariantNip]);

  // Text selection state for rich text editing
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);

  const createNip = useAction(api.nips.createNipWithTabbedFile as any);
  const updateNip = useAction(api.nips.updateNipWithTabbedFile as any);

  // Add custom text section
  const addCustomTextSection = useCallback(() => {
    const newSection: TextSection = {
      id: `custom-${Date.now()}`,
      title: "CUSTOM SECTION:",
      content: "Enter your custom content here...",
      isCustom: true,
    };
    setTextSections((prev) => [...prev, newSection]);
  }, []);

  // Update text section
  const updateTextSection = useCallback(
    (id: string, field: "title" | "content", value: string) => {
      setTextSections((prev) =>
        prev.map((section) =>
          section.id === id ? { ...section, [field]: value } : section
        )
      );
    },
    []
  );

  // Delete custom text section
  const deleteTextSection = useCallback((id: string) => {
    setTextSections((prev) => prev.filter((section) => section.id !== id));
  }, []);

  // Handle text sections reorder
  const handleTextSectionsReorder = useCallback(
    (reorderedSections: TextSection[]) => {
      setTextSections(reorderedSections);
    },
    []
  );

  // Add nutritional row
  const addNutritionalRow = useCallback(() => {
    const newRow: NutritionalRow = {
      id: `nutrient-${Date.now()}`,
      nutrient: "New Nutrient",
      perServe: "0",
      per100g: "0",
    };
    setNutritionalRows((prev) => [...prev, newRow]);
  }, []);

  // Update nutritional row
  const updateNutritionalRow = useCallback(
    (id: string, field: keyof NutritionalRow, value: string) => {
      setNutritionalRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
      );
    },
    []
  );

  // Delete nutritional row
  const deleteNutritionalRow = useCallback((id: string) => {
    setNutritionalRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  

  // Handle nutritional rows reorder
  const handleNutritionalRowsReorder = useCallback(
    (reorderedRows: NutritionalRow[]) => {
      setNutritionalRows(reorderedRows);
    },
    []
  );

  

  // Create drag handlers for nutritional rows
  const nutritionalDragHandlers = createDragDropHandlers(
    nutritionalRows,
    handleNutritionalRowsReorder,
    draggedNutritionalIndex,
    setDraggedNutritionalIndex
  );

  

  // Handle text selection for rich text editing
  const handleTextSelect = useCallback(
    (textareaId: string, textarea: HTMLTextAreaElement) => {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);

      if (selectedText.length > 0) {
        setSelectedTextId(textareaId);
        setSelectedText(selectedText);
        setSelectionStart(start);
        setSelectionEnd(end);
      } else {
        setSelectedTextId(null);
        setSelectedText("");
      }
    },
    []
  );

  // Apply formatting to selected text
  const applyFormatting = useCallback(
    (format: "bold" | "italic" | "underline") => {
      if (!selectedTextId || !selectedText) return;

      const section = textSections.find((s) => s.id === selectedTextId);
      if (!section) return;

      let formattedText = selectedText;
      switch (format) {
        case "bold":
          formattedText = `<strong>${selectedText}</strong>`;
          break;
        case "italic":
          formattedText = `<em>${selectedText}</em>`;
          break;
        case "underline":
          formattedText = `<u>${selectedText}</u>`;
          break;
      }

      const newContent =
        section.content.substring(0, selectionStart) +
        formattedText +
        section.content.substring(selectionEnd);

      updateTextSection(selectedTextId, "content", newContent);
      setSelectedTextId(null);
      setSelectedText("");
    },
    [
      selectedTextId,
      selectedText,
      selectionStart,
      selectionEnd,
      textSections,
      updateTextSection,
    ]
  );

  // Generate HTML output
  const generateHtml = useCallback(() => {
    const nutritionalThicknessBorder = getThicknessBorderStyle(
      nutritionalRowThickness
    );
    

    let html = `
    <div class="complex-supplements-nip" style="font-family: Arial, sans-serif; max-width: 450px; margin: 0 auto; background: white; padding: 20px;">
      <!-- Nutritional Information Table -->
      <div class="nutritional-info" style="margin-bottom: 20px; border-radius: 8px; overflow: hidden;">
        <div class="table-header" style="background-color: black; color: white; text-align: center; font-weight: bold; font-size: 18px; letter-spacing: 1px;">
          NUTRITIONAL INFORMATION
        </div>
        <div style="text-align: right; padding: 12px; font-size: 12px; border: 2px solid black; border-bottom: 1px solid black;">
          Per Serve / Per 100g
        </div>
        <table style="width: 100%; table-layout: fixed; border-collapse: collapse; border: 2px solid black; border-top: none;">
          <colgroup>
            <col style="width: 50%;" />
            <col style="width: 50%;" />
          </colgroup>
    `;

    // Add nutritional rows
    nutritionalRows.forEach((row) => {
      const rowThicknessBorder = getThicknessBorderStyle(
        nutritionalRowThickness
      );

      if (row.id === "serving-info") {
        // Display serving info as a special row
        html += `
            <tr style="border-bottom: ${rowThicknessBorder};">
              <td colspan="2" style="padding: 8px 12px; font-size: 12px; font-weight: bold; text-align: center; background: black; color: white;">${convertFormattingForHtml(convertTabsForHtml(row.nutrient + " | " + row.perServe))}</td>
            </tr>
        `;
      } else {
        // Regular nutritional rows with nutrient name and values
        html += `
            <tr style="border-bottom: ${rowThicknessBorder};">
              <td style="padding: 8px 12px; font-size: 12px;">${convertFormattingForHtml(convertTabsForHtml(row.nutrient))}</td>
              <td style="padding: 8px 12px; font-size: 12px; text-align: right;">${convertFormattingForHtml(convertTabsForHtml(row.perServe + " / " + row.per100g))}</td>
            </tr>
        `;
      }
    });

    html += `
        </table>
      </div>

      <!-- Text Sections -->
      <div class="text-sections">
    `;

    // Add text sections
    textSections.forEach((section) => {
      html += `
        <div class="text-section" style="margin-bottom: 15px;">
          <h4 style="margin: 0 0 5px 0; font-size: 11px; font-weight: bold; color: black;">${convertFormattingForHtml(convertTabsForHtml(section.title))}</h4>
          <p style="margin: 0; font-size: 11px; line-height: 1.4;">${convertFormattingForHtml(convertTabsForHtml(section.content))}</p>
        </div>
      `;
    });

    html += `
      </div>
    </div>
    `;

    return html;
  }, [
    textSections,
    nutritionalRows,
    nutritionalRowThickness,
  ]);

  // Save NIP
  const handleSave = useCallback(async () => {
    if (!product) {
      toast.error("Product information is required");
      return;
    }

    // For products with variants, require variant selection
    // For products without variants, allow saving at product level
    if (product?.variants && product.variants.length > 1 && !activeVariantId) {
      toast.error("Please select a variant before saving");
      return;
    }

    try {
      const nipData = {
        productId: product._id,
        variantId: activeVariantId || undefined, // Use undefined for products without variants
        templateType: "complex_supplements",
        content: {
          textSections,
          nutritionalRows,
          ingredientRows,
          nutritionalRowThickness,
          ingredientRowThickness,
        },
        htmlContent: generateHtml(),
      };

      let result;
      if (currentVariantNip) {
        result = await updateNip({
          nipId: currentVariantNip._id,
          ...nipData,
        });
        toast.success("Complex supplements NIP updated successfully!");
      } else {
        result = await createNip(nipData);
        toast.success("Complex supplements NIP created successfully!");
      }

      setIsSaved(true);
      onSave(result);
    } catch (error) {
      console.error("Error saving NIP:", error);
      toast.error("Failed to save NIP. Please try again.");
    }
  }, [
    product,
    activeVariantId,
    textSections,
    nutritionalRows,
    ingredientRows,
    nutritionalRowThickness,
    ingredientRowThickness,
    generateHtml,
    currentVariantNip,
    createNip,
    updateNip,
    onSave,
  ]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Complex Supplements NIP Builder
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {product?.title} {variant?.title && `- ${variant.title}`}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPreview(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Preview
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              {currentVariantNip ? "Update" : "Save"} NIP
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Success Message */}
        {isSaved && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  className="h-4 w-4 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <p className="ml-2 text-sm text-green-700">
                  NIP saved successfully!
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsSaved(false)}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Continue Editing
                </button>
                <button
                  onClick={() => onSave(null)}
                  className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Back to NIPs
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Variant Selection */}
        {product?.variants && product.variants.length > 1 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Variant:
            </label>
            <select
              value={activeVariantId || ""}
              onChange={(e) => setActiveVariantId(e.target.value || null)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a variant...</option>
              {product.variants.map((v: any) => (
                <option key={v._id} value={v._id}>
                  {v.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-700">
            Quick Actions:
          </span>
          <button
            onClick={addCustomTextSection}
            className="px-3 py-1 text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded"
          >
            + Add Text Section
          </button>
          <button
            onClick={addNutritionalRow}
            className="px-3 py-1 text-xs bg-green-50 hover:bg-green-100 border border-green-200 rounded"
          >
            + Add Nutritional Row
          </button>
          
          {selectedText && (
            <div className="flex items-center space-x-1 ml-4 pl-4 border-l border-gray-300">
              <span className="text-xs text-gray-600">Format:</span>
              <button
                onClick={() => applyFormatting("bold")}
                className="px-2 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 rounded"
              >
                B
              </button>
              <button
                onClick={() => applyFormatting("italic")}
                className="px-2 py-1 text-xs italic bg-gray-100 hover:bg-gray-200 rounded"
              >
                I
              </button>
              <button
                onClick={() => applyFormatting("underline")}
                className="px-2 py-1 text-xs underline bg-gray-100 hover:bg-gray-200 rounded"
              >
                U
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Column: Text Sections */}
        <div className="flex-1 p-6 bg-white border-r border-gray-200 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Text Sections</h3>

          <DraggableTextSection
            sections={textSections}
            onSectionsReorder={handleTextSectionsReorder}
            onUpdateSection={updateTextSection}
            onDeleteSection={deleteTextSection}
            onTextSelect={(sectionId: string, element: HTMLElement) => {
              if (element instanceof HTMLTextAreaElement) {
                handleTextSelect(sectionId, element);
              }
            }}
          />
        </div>

        {/* Right Column: Tables */}
        <div className="flex-1 p-6 bg-white overflow-y-auto">
          {/* Nutritional Information Table */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Nutritional Information</h4>
              <button
                onClick={addNutritionalRow}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Row
              </button>
            </div>
            <div className="border-2 border-black rounded-lg overflow-hidden">
              <div className="bg-black text-white text-center font-bold  text-2xl py-0 tracking-[0.5em] w-full">
                NUTRITIONAL INFORMATION
              </div>
              <div className="text-right px-3 py-3 text-sm border-b-2 border-black">
                Per Serve / Per 100g
              </div>

              <div className="p-2">
                <table className="w-full table-fixed border-b-2 border-black">
                  <colgroup>
                    <col className="w-1/2" />
                    <col className="w-1/2" />
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-2 py-1 text-xs font-medium">
                        Nutrient
                      </th>
                      <th className="text-right px-2 py-1 text-xs font-medium">
                        Values
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {nutritionalRows.map((row, index) => (
                      <tr
                        key={row.id}
                        draggable
                        onDragStart={(e) =>
                          nutritionalDragHandlers.onDragStart(e, index)
                        }
                        onDragOver={nutritionalDragHandlers.onDragOver}
                        onDrop={(e) => nutritionalDragHandlers.onDrop(e, index)}
                        onDragEnd={nutritionalDragHandlers.onDragEnd}
                        className={`${getBorderClass(nutritionalRowThickness)} hover:bg-gray-50 cursor-move ${
                          draggedNutritionalIndex === index ? "opacity-50" : ""
                        }`}
                        style={
                          draggedNutritionalIndex === index
                            ? getDragHandleStyles()
                            : {}
                        }
                      >
                        <td className="px-0 py-2">
                          <FormattableTableInput
                            value={row.nutrient}
                            onChange={(value) =>
                              updateNutritionalRow(row.id, "nutrient", value)
                            }
                            className="w-full text-sm bg-transparent border-none outline-none"
                            disabled={
                              product?.variants &&
                              product.variants.length > 1 &&
                              !activeVariantId
                            }
                            rowThickness={nutritionalRowThickness}
                            onThicknessChange={setNutritionalRowThickness}
                          />
                        </td>
                        <td className="px-0 py-0 relative">
                          <div className="flex items-center">
                            <FormattableTableInput
                              value={
                                row.id === "serving-info"
                                  ? `${row.nutrient} | ${row.perServe}`
                                  : `${row.perServe} / ${row.per100g}`
                              }
                              onChange={(value) => {
                                if (row.id === "serving-info") {
                                  const parts = value.split(" | ");
                                  if (parts.length === 2) {
                                    updateNutritionalRow(
                                      row.id,
                                      "nutrient",
                                      parts[0]
                                    );
                                    updateNutritionalRow(
                                      row.id,
                                      "perServe",
                                      parts[1]
                                    );
                                  }
                                } else {
                                  const parts = value.split(" / ");
                                  if (parts.length === 2) {
                                    updateNutritionalRow(
                                      row.id,
                                      "perServe",
                                      parts[0]
                                    );
                                    updateNutritionalRow(
                                      row.id,
                                      "per100g",
                                      parts[1]
                                    );
                                  }
                                }
                              }}
                              className="flex-1 text-sm bg-transparent border-none outline-none text-right pr-6"
                              disabled={
                                product?.variants &&
                                product.variants.length > 1 &&
                                !activeVariantId
                              }
                              rowThickness={nutritionalRowThickness}
                              onThicknessChange={setNutritionalRowThickness}
                            />
                            <button
                              onClick={() => deleteNutritionalRow(row.id)}
                              className="absolute right-1 text-red-500 hover:text-red-700 text-xs"
                            >
                              ×
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          
        </div>
      </div>

      {/* Tabbed Preview Modal */}
      {showPreview && (
        <TabbedPreviewModal
          title="Complex Supplements NIP"
          isOpen={showPreview}
          productId={product._id}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
