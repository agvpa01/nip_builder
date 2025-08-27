import React, { useState, useCallback, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { DraggableTextSection } from "./DraggableTextSection";
import { PreviewModal } from "./PreviewModal";
import { FormattableTableInput } from "./FormattableTableInput";
import { getThicknessBorderStyle } from "../lib/utils";
import { convertTabsForHtml, convertFormattingForHtml } from "../lib/tabUtils";

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
        "Magnesium Oxide, Calcium Carbonate, Vitamin D3 (Cholecalciferol), Microcrystalline Cellulose, Magnesium Stearate, Silicon Dioxide.",
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
      nutrient: "Protein (g)",
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

  // Add ingredient row
  const addIngredientRow = useCallback(() => {
    const newRow: IngredientRow = {
      id: `ingredient-${Date.now()}`,
      ingredient: "New Ingredient",
      amount: "0mg",
      dailyValue: "0%",
    };
    setIngredientRows((prev) => [...prev, newRow]);
  }, []);

  // Update ingredient row
  const updateIngredientRow = useCallback(
    (id: string, field: keyof IngredientRow, value: string) => {
      setIngredientRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
      );
    },
    []
  );

  // Delete ingredient row
  const deleteIngredientRow = useCallback((id: string) => {
    setIngredientRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

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
    const ingredientThicknessBorder = getThicknessBorderStyle(
      ingredientRowThickness
    );

    let html = `
    <div class="complex-supplements-nip" style="font-family: Arial, sans-serif; max-width: 450px; margin: 0 auto; background: white; padding: 20px;">
      <!-- Nutritional Information Table -->
      <div class="nutritional-info" style="margin-bottom: 20px; border-radius: 8px; overflow: hidden;">
        <div class="table-header" style="background-color: black; color: white; text-align: center; font-weight: bold; font-size: 18px;">
          NUTRITIONAL INFORMATION
        </div>
        <table style="width: 100%; table-layout: fixed; border-collapse: collapse; border: 2px solid black;">
    `;

    // Add serving information and column headers
    const servingRow = nutritionalRows.find((row) => row.id === "serving-info");
    if (servingRow) {
      html += `
        <!-- Serving Information -->
        <div style="padding: 12px; border: 2px solid black; border-bottom: 1px solid black; background: white;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold;">
            <span>${servingRow.nutrient}</span>
            <span>${servingRow.perServe}</span>
          </div>
        </div>
        <!-- Column Headers -->
        <div style="padding: 12px; border: 2px solid black; border-top: none; border-bottom: 2px solid black; background: white;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold;">
            <span style="flex: 1; text-align: right;">Per Serve</span>
            <span style="flex: 1; text-align: right;">Per 100g</span>
          </div>
        </div>
      `;
    }

    html += `
            <colgroup>
              <col style="width: 50%;" />
              <col style="width: 50%;" />
            </colgroup>
    `;

    // Add nutritional rows (skip serving-info row)
    nutritionalRows.forEach((row, index) => {
      if (row.id === "serving-info") return; // Skip serving info row as it's displayed above

      const bgColor = index % 2 === 0 ? "white" : "#f9f9f9";
      html += `
            <tr style="background-color: ${bgColor}; border-bottom: 1px solid black;">
              <td colspan="2" style="padding: 8px 12px; font-size: 12px; font-weight: 500; border-bottom: 1px solid #ddd;">${convertFormattingForHtml(convertTabsForHtml(row.nutrient))}</td>
          </tr>
          <tr style="background-color: ${bgColor};">
            <td style="padding: 8px 12px; font-size: 12px; text-align: right; font-weight: 500; border-right: 1px solid black;">${convertFormattingForHtml(convertTabsForHtml(row.perServe))}</td>
            <td style="padding: 8px 12px; font-size: 12px; text-align: right; font-weight: 500;">${convertFormattingForHtml(convertTabsForHtml(row.per100g))}</td>
            </tr>
    `;
    });

    html += `
        </table>
      </div>

      <!-- Compositional Information Table -->
      <div class="supplement-facts" style="margin-bottom: 20px; border-radius: 8px; overflow: hidden;">
        <div class="table-header" style="background-color: black; color: white; text-align: center; font-weight: bold; font-size: 18px;">
          COMPOSITIONAL INFORMATION
        </div>
        <table style="width: 100%; table-layout: fixed; border-collapse: collapse; border: 2px solid black;">
          <colgroup>
            <col style="width: 40%;" />
            <col style="width: 25%;" />
            <col style="width: 25%;" />
          </colgroup>
          <tr style="border-bottom: ${ingredientThicknessBorder};">
            <td style="padding: 8px 12px; font-size: 12px; font-weight: bold;">Ingredient</td>
            <td style="padding: 8px 12px; font-size: 12px; text-align: right; font-weight: bold;">Amount</td>
            <td style="padding: 8px 12px; font-size: 12px; text-align: right; font-weight: bold;">Daily Value</td>
          </tr>
    `;

    // Add ingredient rows
    ingredientRows.forEach((row) => {
      html += `
            <tr style="border-bottom: ${ingredientThicknessBorder};">
              <td style="padding: 8px 12px; font-size: 12px;">${convertFormattingForHtml(convertTabsForHtml(row.ingredient))}</td>
              <td style="padding: 8px 12px; font-size: 12px; text-align: right;">${convertFormattingForHtml(convertTabsForHtml(row.amount))}</td>
              <td style="padding: 8px 12px; font-size: 12px; text-align: right;">${convertFormattingForHtml(convertTabsForHtml(row.dailyValue))}</td>
            </tr>
    `;
    });

    html += `
          <tr>
            <td colspan="3" style="padding: 8px 12px; font-size: 11px; font-style: italic; text-align: center;">* Daily Value not established</td>
          </tr>
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
    ingredientRows,
    nutritionalRowThickness,
    ingredientRowThickness,
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
          <button
            onClick={addIngredientRow}
            className="px-3 py-1 text-xs bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded"
          >
            + Add Ingredient
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
            <h3 className="text-lg font-semibold mb-4">
              Nutritional Information
            </h3>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="bg-black text-white text-center font-bold text-lg">
                NUTRITIONAL INFORMATION
              </div>
              {/* Serving Information */}
              {(() => {
                const servingRow = nutritionalRows.find(
                  (row) => row.id === "serving-info"
                );
                return servingRow ? (
                  <div className="px-3 py-3 border-2 border-b border-black bg-white">
                    <div className="flex justify-between text-xs font-bold">
                      <span>{servingRow.nutrient}</span>
                      <span>{servingRow.perServe}</span>
                    </div>
                  </div>
                ) : null;
              })()}
              {/* Column Headers */}
              <div className="px-3 py-3 border-2 border-t-0 border-b-2 border-black bg-white">
                <div className="flex justify-between text-xs font-bold">
                  <span className="flex-1 text-right">Per Serve</span>
                  <span className="flex-1 text-right">Per 100g</span>
                </div>
              </div>
              <table className="w-full table-fixed border-collapse border-2 border-black border-t-0">
                <colgroup>
                  <col className="w-full" />
                  <col className="w-8" />
                </colgroup>
                <tbody>
                  {nutritionalRows.map((row) => {
                    if (row.id === "serving-info") return null; // Skip serving info row

                    return (
                      <React.Fragment key={row.id}>
                        <tr
                          className={`${getBorderClass(nutritionalRowThickness)} hover:bg-gray-50`}
                        >
                          <td className="px-3 py-2" colSpan={2}>
                            <FormattableTableInput
                              value={row.nutrient}
                              onChange={(value) =>
                                updateNutritionalRow(row.id, "nutrient", value)
                              }
                              className="w-full text-sm border-none outline-none bg-transparent font-medium"
                              disabled={
                                product?.variants &&
                                product.variants.length > 1 &&
                                !activeVariantId
                              }
                              rowThickness={nutritionalRowThickness}
                              onThicknessChange={setNutritionalRowThickness}
                            />
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-center border-r border-black">
                            <FormattableTableInput
                              value={row.perServe}
                              onChange={(value) =>
                                updateNutritionalRow(row.id, "perServe", value)
                              }
                              disabled={
                                product?.variants &&
                                product.variants.length > 1 &&
                                !activeVariantId
                              }
                              className="w-full text-sm text-right border-none outline-none bg-transparent font-medium"
                              rowThickness={nutritionalRowThickness}
                              onThicknessChange={setNutritionalRowThickness}
                            />
                          </td>
                          <td className="px-3 py-2 text-center relative">
                            <FormattableTableInput
                              value={row.per100g}
                              onChange={(value) =>
                                updateNutritionalRow(row.id, "per100g", value)
                              }
                              className="w-full text-sm text-right border-none outline-none bg-transparent font-medium pr-6"
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
                              className="absolute right-1 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 text-xs"
                            >
                              ×
                            </button>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Compositional Information Table */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">
              Compositional Information
            </h3>
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="bg-black text-white text-center font-bold text-lg">
                COMPOSITIONAL INFORMATION
              </div>
              <table className="w-full table-fixed border-b-2 border-black">
                <colgroup>
                  <col className="w-2/5" />
                  <col className="w-1/4" />
                  <col className="w-1/4" />
                  <col className="w-8" />
                </colgroup>
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left px-3 py-2 text-sm font-medium">
                      Ingredient
                    </th>
                    <th className="text-right px-3 py-2 text-sm font-medium">
                      Amount
                    </th>
                    <th className="text-right px-3 py-2 text-sm font-medium">
                      Daily Value
                    </th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {ingredientRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`${getBorderClass(ingredientRowThickness)} hover:bg-gray-50`}
                    >
                      <td className="px-3 py-2">
                        <FormattableTableInput
                          value={row.ingredient}
                          onChange={(value) =>
                            updateIngredientRow(row.id, "ingredient", value)
                          }
                          className="w-full text-sm border-none outline-none bg-transparent"
                          disabled={
                            product?.variants &&
                            product.variants.length > 1 &&
                            !activeVariantId
                          }
                          rowThickness={ingredientRowThickness}
                          onThicknessChange={setIngredientRowThickness}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <FormattableTableInput
                          value={row.amount}
                          onChange={(value) =>
                            updateIngredientRow(row.id, "amount", value)
                          }
                          className="w-full text-sm text-right border-none outline-none bg-transparent"
                          disabled={
                            product?.variants &&
                            product.variants.length > 1 &&
                            !activeVariantId
                          }
                          rowThickness={ingredientRowThickness}
                          onThicknessChange={setIngredientRowThickness}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <FormattableTableInput
                          value={row.dailyValue}
                          onChange={(value) =>
                            updateIngredientRow(row.id, "dailyValue", value)
                          }
                          className="w-full text-sm text-right border-none outline-none bg-transparent"
                          disabled={
                            product?.variants &&
                            product.variants.length > 1 &&
                            !activeVariantId
                          }
                          rowThickness={ingredientRowThickness}
                          onThicknessChange={setIngredientRowThickness}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => deleteIngredientRow(row.id)}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-3 py-3 text-center text-sm text-gray-600 italic border-t">
                * Daily Value not established
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal
          title="Complex Supplements NIP Preview"
          isOpen={showPreview}
          htmlContent={generateHtml()}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
