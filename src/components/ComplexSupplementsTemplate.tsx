import React, { useState, useCallback, useEffect } from "react";
import { useAction, useQuery, useMutation } from "convex/react";
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
  thickness?:
    | "normal"
    | "thick"
    | "medium-thick"
    | "large-thick"
    | "extra-large-thick";
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
  const [variantsList, setVariantsList] = useState<any[]>(
    product?.variants || []
  );
  useEffect(() => {
    setVariantsList(product?.variants || []);
  }, [product?._id]);
  const createProductVariant = useMutation(api.products.createProductVariant);
  const deleteProductVariant = useMutation(api.products.deleteProductVariant);
  const [addingVariant, setAddingVariant] = useState(false);
  const [newVarTitle, setNewVarTitle] = useState("");
  const [newVarImageUrl, setNewVarImageUrl] = useState("");
  const [savingVar, setSavingVar] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Query NIPs for all variants of this product
  const productNips = useQuery(
    api.nips.getNipsByProduct,
    product ? { productId: product._id } : "skip"
  );

  // Get current variant NIP
  const currentVariantNip = productNips?.find(
    (nip) =>
      nip.variantId === activeVariantId &&
      nip.templateType === "complex_supplements"
  );

  // Initialize text sections with serving info + Ingredients
  const [textSections, setTextSections] = useState<TextSection[]>([
    {
      id: "serving-size-line",
      title: "SERVING SIZE LINE:",
      content: "Serving Size: 1-2 capsules",
      isCustom: false,
    },
    {
      id: "servings-per-container-line",
      title: "SERVINGS PER CONTAINER LINE:",
      content: "Servings per Container: 30-60",
      isCustom: false,
    },
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

  // Toggle for including full text sections in generated HTML
  const [showTextSections, setShowTextSections] = useState(true);

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
        if (typeof content.showTextSections === "boolean") {
          setShowTextSections(content.showTextSections);
        }
        if (content.textSections) {
          let mergedSections: TextSection[] =
            content.textSections as TextSection[];
          const hasServingSize = mergedSections.some(
            (s) => s.id === "serving-size-line"
          );
          const hasServingsContainer = mergedSections.some(
            (s) => s.id === "servings-per-container-line"
          );
          const toAdd: TextSection[] = [];
          if (!hasServingSize) {
            toAdd.push({
              id: "serving-size-line",
              title: "SERVING SIZE LINE:",
              content: "Serving Size: 1-2 capsules",
              isCustom: false,
            });
          }
          if (!hasServingsContainer) {
            toAdd.push({
              id: "servings-per-container-line",
              title: "SERVINGS PER CONTAINER LINE:",
              content: "Servings per Container: 30-60",
              isCustom: false,
            });
          }
          if (toAdd.length > 0) mergedSections = [...toAdd, ...mergedSections];
          setTextSections(mergedSections);
        }
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
    <K extends keyof NutritionalRow>(
      id: string,
      field: K,
      value: NutritionalRow[K]
    ) => {
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
    // Serving info comes from Text Sections (fallback to row data for legacy)
    const servingSizeText =
      (textSections.find((s) => s.id === "serving-size-line")
        ?.content as string) ||
      nutritionalRows.find((r) => r.id === "serving-info")?.nutrient ||
      "Serving Size";
    const servingsPerText =
      (textSections.find((s) => s.id === "servings-per-container-line")
        ?.content as string) ||
      nutritionalRows.find((r) => r.id === "serving-info")?.perServe ||
      "Servings per Container";

    let html = `
    <div class="complex-supplements-nip" style="font-family: Arial, sans-serif; max-width: 94%; margin: 0 auto;">
      <!-- Nutritional Information Table -->
              <div class="nutritional-info" style="margin-bottom: 20px; border-radius: 8px; overflow: hidden;">
                <div class="table-header" style="background: black; color: white; text-align: center; font-weight: bold; font-size: 23px !important; letter-spacing: 0.8px !important; padding: 8px; padding-bottom: 6px;">
                  NUTRITIONAL INFORMATION
                </div>
                <!-- Serving Information -->
                <div style="padding: 10px; padding-top: 0px; padding-bottom: 0px; border: 2px solid black !important; border-bottom: none !important;">
                <div style="padding: 8px 0px;  border-bottom: 5px solid black !important;">
                  <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold;">
                    <span style="margin-bottom: 3px;">${convertFormattingForHtml(convertTabsForHtml(servingSizeText))}</span>
                    <span>${convertFormattingForHtml(convertTabsForHtml(servingsPerText))}</span>
                  </div>
                </div>
                </div>
      
                <div style="padding: 10px; padding-top:0px; border: 2px solid black !important; border-top: none !important; margin-bottom:10px; border-radius: 0 0 8px 8px; overflow: hidden;">
                <table style="width: 100%; table-layout: fixed; border-collapse: collapse; border: none !important;">
                  <colgroup>
                    <col style="width: 45%;" />
                    <col style="width: 25%;" />
                    <col style="width: 30%;" />
                  </colgroup>
                  <thead>
                    <tr style="border-bottom: 5px solid black !important;">
                      <th style="text-align: left; padding: 4px 0px; font-size: 14px; font-weight: 500; border: none !important;"></th>
                      <th style="text-align: right; padding: 4px 0px; font-size: 14px; font-weight: 500; border: none !important;">Per Serve</th>
                      <th style="text-align: right; padding: 4px 0px; font-size: 14px; font-weight: 500; border: none !important;">Per 100g</th>
                    </tr>
                  </thead>
                  <tbody>
          `;

    // Add nutritional rows (skip serving-info row as it's now displayed separately)
    nutritionalRows.forEach((row, index) => {
      if (row.id === "serving-info") return; // Skip serving info row

      const rowThicknessBorder = getThicknessBorderStyle(
        row.thickness || "normal"
      );

      const perServeEmpty = !row.perServe || row.perServe.trim() === "";
      const per100gEmpty = !row.per100g || row.per100g.trim() === "";
      const isLast = index + 1 === nutritionalRows.length;
      const borderStyle = isLast ? "none" : rowThicknessBorder;

      if (perServeEmpty && per100gEmpty) {
        html += `
                  <tr style="border-bottom: ${borderStyle} !important;">
                    <td colspan="3" style="padding: 3px 0px; font-size: 14px; font-weight: 500; border: none !important;">${convertFormattingForHtml(convertTabsForHtml(row.nutrient))}</td>
                  </tr>
              `;
      } else {
        html += `
                  <tr style="border-bottom: ${borderStyle} !important;">
                    <td style="padding: 3px 0px; font-size: 14px; font-weight: 500; border: none !important;">${convertFormattingForHtml(convertTabsForHtml(row.nutrient))}</td>
                    <td style="padding: 3px 0px; font-size: 14px; text-align: right; border: none !important;">${convertFormattingForHtml(convertTabsForHtml(row.perServe))}</td>
                    <td style="padding: 3px 0px; font-size: 14px; text-align: right; border: none !important;">${convertFormattingForHtml(convertTabsForHtml(row.per100g))}</td>
                  </tr>
              `;
      }
    });

    html += `
                  </tbody>
                </table>
              </div>

      `;

    // Text sections block
    const ing = textSections.find((s) => s.id === "ingredients");
    if (showTextSections) {
      html += `
        <!-- Text Sections -->
        <div class="text-sections">
      `;
      textSections.forEach((section) => {
        if (
          section.id !== "serving-size-line" &&
          section.id !== "servings-per-container-line"
        ) {
          html += `
            <div class="text-section" style="margin-bottom: 15px;">
              <p style="margin: 0 0 5px 0; font-size: 14px; font-weight: bold; color: black;">${convertFormattingForHtml(convertTabsForHtml(section.title))}</p>
              <p style="margin: 0; font-size: 14px; line-height: 1.4;">${convertFormattingForHtml(convertTabsForHtml(section.content))}</p>
            </div>
          `;
        }
      });
      html += `
        </div>
      `;
    } else if (ing) {
      html += `
        <!-- Ingredients Only -->
        <div class="text-sections">
          <div class="text-section" style="margin-bottom: 15px;">
            <h4 style="margin: 0 0 5px 0; font-size: 14px; font-weight: bold; color: black;">${convertFormattingForHtml(convertTabsForHtml(ing.title))}</h4>
            <p style="margin: 0; font-size: 14px; line-height: 1.4;">${convertFormattingForHtml(convertTabsForHtml(ing.content))}</p>
          </div>
        </div>
      `;
    }

    html += `
    </div>
    `;

    return html;
  }, [
    textSections,
    nutritionalRows,
    nutritionalRowThickness,
    showTextSections,
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
          showTextSections,
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
              Pre-workout NIP Builder
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
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        {/* Variant Selection + Add */}
        {variantsList && variantsList.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Variant:
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setAddingVariant((v) => !v)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {addingVariant ? "Cancel" : "+ Add Variant"}
                </button>
                {activeVariantId && (
                  <div className="flex justify-end">
                    &nbsp;|&nbsp;
                    <button
                      type="button"
                      className="text-xs text-red-600 hover:text-red-800"
                      onClick={async () => {
                        const v = variantsList.find(
                          (v) => String(v._id) === String(activeVariantId)
                        );
                        const ok = confirm(
                          `Delete variant "${v?.title || "Selected"}"? This will also remove its NIPs.`
                        );
                        if (!ok) return;
                        try {
                          await deleteProductVariant({
                            variantId: activeVariantId as any,
                          });
                          setVariantsList((l) =>
                            l.filter(
                              (x) => String(x._id) !== String(activeVariantId)
                            )
                          );
                          setActiveVariantId(null);
                          toast.success("Variant deleted");
                        } catch (e) {
                          console.error(e);
                          toast.error("Failed to delete variant");
                        }
                      }}
                    >
                      Delete Selected Variant
                    </button>
                  </div>
                )}
              </div>
            </div>

            <select
              value={activeVariantId || ""}
              onChange={(e) => setActiveVariantId(e.target.value || null)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a variant...</option>
              {variantsList.map((v: any) => (
                <option key={v._id} value={v._id}>
                  {v.title}
                </option>
              ))}
            </select>
            {addingVariant && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-2">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="Variant title"
                    value={newVarTitle}
                    onChange={(e) => setNewVarTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="url"
                    placeholder="Image URL (optional)"
                    value={newVarImageUrl}
                    onChange={(e) => setNewVarImageUrl(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-1 flex items-center">
                  <button
                    type="button"
                    disabled={savingVar}
                    onClick={async () => {
                      const title = newVarTitle.trim();
                      if (!title) {
                        toast.error("Please enter a variant title");
                        return;
                      }
                      try {
                        setSavingVar(true);
                        const variantId = await createProductVariant({
                          productId: product._id,
                          title,
                          imageUrl: newVarImageUrl.trim(),
                        } as any);
                        setVariantsList((list) => [
                          ...list,
                          {
                            _id: variantId,
                            title,
                            imageUrl: newVarImageUrl.trim(),
                          },
                        ]);
                        setActiveVariantId(String(variantId));
                        setNewVarTitle("");
                        setNewVarImageUrl("");
                        setAddingVariant(false);
                        toast.success("Variant added");
                      } catch (e) {
                        console.error(e);
                        toast.error("Failed to add variant");
                      } finally {
                        setSavingVar(false);
                      }
                    }}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingVar ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Text Sections</h3>
            <label className="text-xs text-gray-700 inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={showTextSections}
                onChange={(e) => setShowTextSections(e.target.checked)}
              />
              Show Text Sections
            </label>
          </div>

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
              <div className="px-3 py-3 text-xs font-bold border-b-2 border-black bg-white">
                <div className="flex flex-col">
                  <span>
                    {textSections.find((s) => s.id === "serving-size-line")
                      ?.content || "Serving Size: 1-2 capsules"}
                  </span>
                  <span>
                    {textSections.find(
                      (s) => s.id === "servings-per-container-line"
                    )?.content || "Servings per Container: 30-60"}
                  </span>
                </div>
              </div>

              <div className="p-2">
                <table className="w-full table-fixed border-b-2 border-black">
                  <colgroup>
                    <col className="w-1/2" />
                    <col className="w-1/4" />
                    <col className="w-1/4" />
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-2 py-1 text-xs font-medium">
                        Nutrient
                      </th>
                      <th className="text-right px-2 py-1 text-xs font-medium">
                        Per Serve
                      </th>
                      <th className="text-right px-2 py-1 text-xs font-medium">
                        Per 100g
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {nutritionalRows.map((row, index) => {
                      if (row.id === "serving-info") return null; // shown above from Text Sections
                      const perServeEmpty =
                        !row.perServe || row.perServe.trim() === "";
                      const per100gEmpty =
                        !row.per100g || row.per100g.trim() === "";
                      const spanAll = perServeEmpty && per100gEmpty;
                      return (
                        <tr
                          key={row.id}
                          onDragStart={(e) =>
                            nutritionalDragHandlers.onDragStart(e, index)
                          }
                          onDragOver={nutritionalDragHandlers.onDragOver}
                          onDrop={(e) =>
                            nutritionalDragHandlers.onDrop(e, index)
                          }
                          onDragEnd={nutritionalDragHandlers.onDragEnd}
                          className={`${getBorderClass(row.thickness || "normal")} hover:bg-gray-50 ${
                            draggedNutritionalIndex === index
                              ? "opacity-50"
                              : ""
                          }`}
                          style={
                            draggedNutritionalIndex === index
                              ? getDragHandleStyles()
                              : {}
                          }
                        >
                          {spanAll ? (
                            <td className="px-0 py-2 relative" colSpan={3}>
                              <div className="flex items-center">
                                <FormattableTableInput
                                  value={row.nutrient}
                                  onChange={(value) =>
                                    updateNutritionalRow(
                                      row.id,
                                      "nutrient",
                                      value
                                    )
                                  }
                                  className="w-full text-sm bg-transparent border-none outline-none pr-12"
                                  disabled={
                                    product?.variants &&
                                    product.variants.length > 1 &&
                                    !activeVariantId
                                  }
                                  rowThickness={row.thickness || "normal"}
                                  onThicknessChange={(t) =>
                                    updateNutritionalRow(row.id, "thickness", t)
                                  }
                                />
                                {/* Drag handle button for row reordering */}
                                <button
                                  aria-label="Drag to reorder"
                                  title="Drag to reorder"
                                  draggable
                                  onDragStart={(e) =>
                                    nutritionalDragHandlers.onDragStart(
                                      e,
                                      index
                                    )
                                  }
                                  onDragEnd={nutritionalDragHandlers.onDragEnd}
                                  className="absolute right-6 inline-flex items-center justify-center w-5 h-5 text-gray-500 hover:text-gray-700 cursor-grab active:cursor-grabbing"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className="w-4 h-4"
                                  >
                                    <path d="M7 5a1 1 0 11-2 0 1 1 0 012 0zm8 0a1 1 0 11-2 0 1 1 0 012 0zM7 10a1 1 0 11-2 0 1 1 0 012 0zm8 0a1 1 0 11-2 0 1 1 0 012 0zM7 15a1 1 0 11-2 0 1 1 0 012 0zm8 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => deleteNutritionalRow(row.id)}
                                  className="absolute right-1 text-red-500 hover:text-red-700 text-xs"
                                >
                                  ×
                                </button>
                              </div>
                            </td>
                          ) : (
                            <>
                              <td className="px-0 py-2">
                                <FormattableTableInput
                                  value={row.nutrient}
                                  onChange={(value) =>
                                    updateNutritionalRow(
                                      row.id,
                                      "nutrient",
                                      value
                                    )
                                  }
                                  className="w-full text-sm bg-transparent border-none outline-none"
                                  disabled={
                                    product?.variants &&
                                    product.variants.length > 1 &&
                                    !activeVariantId
                                  }
                                  rowThickness={row.thickness || "normal"}
                                  onThicknessChange={(t) =>
                                    updateNutritionalRow(row.id, "thickness", t)
                                  }
                                />
                              </td>
                              <td className="px-0 py-2">
                                <FormattableTableInput
                                  value={row.perServe}
                                  onChange={(value) =>
                                    updateNutritionalRow(
                                      row.id,
                                      "perServe",
                                      value
                                    )
                                  }
                                  className="w-full text-sm bg-transparent border-none outline-none text-right"
                                  disabled={
                                    product?.variants &&
                                    product.variants.length > 1 &&
                                    !activeVariantId
                                  }
                                  rowThickness={row.thickness || "normal"}
                                  onThicknessChange={(t) =>
                                    updateNutritionalRow(row.id, "thickness", t)
                                  }
                                />
                              </td>
                              <td className="px-0 py-2 relative">
                                <div className="flex items-center">
                                  <FormattableTableInput
                                    value={row.per100g}
                                    onChange={(value) =>
                                      updateNutritionalRow(
                                        row.id,
                                        "per100g",
                                        value
                                      )
                                    }
                                    className="flex-1 text-sm bg-transparent border-none outline-none text-right pr-12"
                                    disabled={
                                      product?.variants &&
                                      product.variants.length > 1 &&
                                      !activeVariantId
                                    }
                                    rowThickness={row.thickness || "normal"}
                                    onThicknessChange={(t) =>
                                      updateNutritionalRow(
                                        row.id,
                                        "thickness",
                                        t
                                      )
                                    }
                                  />
                                  {/* Drag handle button for row reordering */}
                                  <button
                                    aria-label="Drag to reorder"
                                    title="Drag to reorder"
                                    draggable
                                    onDragStart={(e) =>
                                      nutritionalDragHandlers.onDragStart(
                                        e,
                                        index
                                      )
                                    }
                                    onDragEnd={
                                      nutritionalDragHandlers.onDragEnd
                                    }
                                    className="absolute right-6 inline-flex items-center justify-center w-5 h-5 text-gray-500 hover:text-gray-700 cursor-grab active:cursor-grabbing"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 20 20"
                                      fill="currentColor"
                                      className="w-4 h-4"
                                    >
                                      <path d="M7 5a1 1 0 11-2 0 1 1 0 012 0zm8 0a1 1 0 11-2 0 1 1 0 012 0zM7 10a1 1 0 11-2 0 1 1 0 012 0zm8 0a1 1 0 11-2 0 1 1 0 012 0zM7 15a1 1 0 11-2 0 1 1 0 012 0zm8 0a1 1 0 11-2 0 1 1 0 012 0z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => deleteNutritionalRow(row.id)}
                                    className="absolute right-1 text-red-500 hover:text-red-700 text-xs"
                                  >
                                    ×
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
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
          templateType="complex_supplements"
          variants={product.variants}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
