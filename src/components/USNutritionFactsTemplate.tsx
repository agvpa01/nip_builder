import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { FormattableTableInput } from "./FormattableTableInput";
import { TabbedPreviewModal } from "./TabbedPreviewModal";
import { convertFormattingForHtml, convertTabsForHtml } from "../lib/tabUtils";
import { getThicknessBorderStyle } from "../lib/utils";
import { createDragDropHandlers, getDragHandleStyles } from "../lib/dragDropUtils";
import { DraggableTextSection } from "./DraggableTextSection";

interface USNutritionFactsTemplateProps {
  product: any;
  variant?: any;
  currentNip: any;
  onSave: (nip: any) => void;
  onCancel: () => void;
}

type Thickness =
  | "normal"
  | "thick"
  | "medium-thick"
  | "large-thick"
  | "extra-large-thick";

interface USRow {
  id: string;
  nutrient: string;
  amount: string;
  percentDv: string; // e.g., "0%"; empty if not applicable
  indentLevel?: number; // auto from leading tabs/spaces (4 spaces = 1 level)
  italic?: boolean; // e.g., Trans Fat label
  bold?: boolean; // e.g., Protein row
  thickness?: Thickness;
}

export function USNutritionFactsTemplate({
  product,
  variant,
  currentNip,
  onSave,
  onCancel,
}: USNutritionFactsTemplateProps) {
  const [activeVariantId, setActiveVariantId] = useState<string | null>(
    variant?._id || null
  );
  const [showPreview, setShowPreview] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const productNips = useQuery(
    api.nips.getNipsByProduct,
    product ? { productId: product._id } : "skip"
  );

  const currentVariantNip = productNips?.find(
    (nip) => nip.variantId === activeVariantId && nip.templateType === "us_nutrition_facts"
  );

  // Header fields
  const [servingsPerContainer, setServingsPerContainer] = useState("33 Servings per container");
  const [servingSize, setServingSize] = useState("1 scoop (30g)");
  const [calories, setCalories] = useState("110");

  const [rows, setRows] = useState<USRow[]>([
    { id: "fat-total", nutrient: "Total Fat", amount: "0g", percentDv: "0%", thickness: "large-thick", bold: true },
    { id: "fat-sat", nutrient: "Saturated Fat", amount: "0g", percentDv: "0%", indentLevel: 1 },
    { id: "fat-trans", nutrient: "Trans Fat", amount: "0g", percentDv: "", indentLevel: 1, italic: true },
    { id: "chol", nutrient: "Cholesterol", amount: "0mg", percentDv: "0%" },
    { id: "sodium", nutrient: "Sodium", amount: "60mg", percentDv: "3%", thickness: "medium-thick" },
    { id: "carb-total", nutrient: "Total Carbohydrate", amount: "2g", percentDv: "1%", thickness: "medium-thick", bold: true },
    { id: "fiber", nutrient: "Dietary Fiber", amount: "0g", percentDv: "0%", indentLevel: 1 },
    { id: "sugars-total", nutrient: "Total Sugars", amount: "1g", percentDv: "", indentLevel: 1, bold: true },
    { id: "sugars-added", nutrient: "Includes Added Sugars", amount: "0g", percentDv: "", indentLevel: 2 },
    { id: "protein", nutrient: "Protein", amount: "26g", percentDv: "", thickness: "large-thick", bold: true },
    { id: "vit-d", nutrient: "Vitamin D", amount: "0mcg", percentDv: "0%" },
    { id: "calcium", nutrient: "Calcium", amount: "130mg", percentDv: "10%" },
    { id: "iron", nutrient: "Iron", amount: "0mg", percentDv: "0%" },
    { id: "potassium", nutrient: "Potassium", amount: "120mg", percentDv: "2%" },
  ]);

  // Text sections (match AU builders functionality)
  interface TextSection { id: string; title: string; content: string; isCustom: boolean }
  const [textSections, setTextSections] = useState<TextSection[]>([
    {
      id: "directions",
      title: "DIRECTIONS:",
      content:
        "Add 1 scoop (30g) to 200mL water or milk. Shake 20 seconds until dispersed.",
      isCustom: false,
    },
    { id: "serving-size", title: "SERVING SIZE:", content: "30 grams", isCustom: false },
    {
      id: "allergen",
      title: "ALLERGEN ADVICE:",
      content: "Contains Milk and less than 1% Soy Lecithin (as instantiser).",
      isCustom: false,
    },
    {
      id: "storage",
      title: "STORAGE:",
      content: "Keep sealed in a cool, dry place out of direct sunlight.",
      isCustom: false,
    },
  ]);
  const addCustomTextSection = useCallback(() => {
    const newSection: TextSection = {
      id: `custom-${Date.now()}`,
      title: "CUSTOM SECTION:",
      content: "Enter your custom content here...",
      isCustom: true,
    };
    setTextSections((prev) => [...prev, newSection]);
  }, []);
  const updateTextSection = useCallback(
    (id: string, field: "title" | "content", value: string) => {
      setTextSections((prev) =>
        prev.map((section) => (section.id === id ? { ...section, [field]: value } : section))
      );
    },
    []
  );
  const deleteTextSection = useCallback((id: string) => {
    setTextSections((prev) => prev.filter((section) => section.id !== id));
  }, []);
  const handleTextSectionsReorder = useCallback((reordered: TextSection[]) => {
    setTextSections(reordered);
  }, []);

  // Text selection + formatting like AU builders
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const handleTextSelect = useCallback((textareaId: string, textarea: HTMLTextAreaElement) => {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const txt = textarea.value.substring(start, end);
    if (txt.length > 0) {
      setSelectedTextId(textareaId);
      setSelectedText(txt);
      setSelectionStart(start);
      setSelectionEnd(end);
    } else {
      setSelectedTextId(null);
      setSelectedText("");
    }
  }, []);
  const applyFormatting = useCallback(
    (format: "bold" | "italic") => {
      if (!selectedTextId || !selectedText) return;
      const section = textSections.find((s) => s.id === selectedTextId);
      if (!section) return;
      const beforeText = section.content.substring(0, selectionStart);
      const selected = section.content.substring(selectionStart, selectionEnd);
      const afterText = section.content.substring(selectionEnd);
      const tag = format === "bold" ? "strong" : "em";
      const formatted = `<${tag}>${selected}</${tag}>`;
      updateTextSection(selectedTextId, "content", beforeText + formatted + afterText);
      setSelectedTextId(null);
      setSelectedText("");
    },
    [selectedTextId, selectedText, selectionStart, selectionEnd, textSections, updateTextSection]
  );

  // Drag n drop
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const rowDragHandlers = createDragDropHandlers<USRow>(
    rows,
    (reordered) => setRows(reordered),
    draggedIndex,
    setDraggedIndex
  );

  const createNip = useAction(api.nips.createNipWithTabbedFile as any);
  const updateNip = useAction(api.nips.updateNipWithTabbedFile as any);

  // Load existing
  useEffect(() => {
    if (currentVariantNip && currentVariantNip.content) {
      try {
        const c = currentVariantNip.content;
        if (c.servingsPerContainer) setServingsPerContainer(c.servingsPerContainer);
        if (c.servingSize) setServingSize(c.servingSize);
        if (c.calories) setCalories(c.calories);
        if (Array.isArray(c.rows)) setRows(c.rows);
        if (Array.isArray(c.textSections)) setTextSections(c.textSections);
      } catch (e) {
        console.error("Error loading US NIP content", e);
      }
    }
  }, [currentVariantNip]);

  const addRow = useCallback(() => {
    const newRow: USRow = {
      id: `row-${Date.now()}`,
      nutrient: "New Nutrient",
      amount: "0g",
      percentDv: "",
    };
    setRows((p) => [...p, newRow]);
  }, []);

  const updateRow = useCallback(
    <K extends keyof USRow>(id: string, field: K, value: USRow[K]) => {
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    },
    []
  );

  const deleteRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const getBorderClass = (thickness?: Thickness) => {
    switch (thickness) {
      case "thick":
        return "border-b-2 border-gray-800";
      case "medium-thick":
        return "border-b-4 border-gray-800";
      case "large-thick":
        return "border-b-8 border-gray-900";
      case "extra-large-thick":
        return "border-b-8 border-double border-black";
      default:
        return "border-b border-gray-400";
    }
  };

  const generateHtml = useCallback(() => {
    let html = `
    <div class="us-nutrition-facts" style="font-family: Arial, sans-serif; max-width: 300px; margin: 0 auto; background: white; border: 2px solid black;">
      <div style="background: black; color: white; font-weight: 800; font-size: 20px; letter-spacing: 1px; text-align: left; padding: 8px 10px;">NUTRITION FACTS</div>
      <div style="padding: 8px 10px; font-size: 12px;">${convertFormattingForHtml(convertTabsForHtml(servingsPerContainer))}</div>
      <div style="padding: 0 10px 8px 10px; display: flex; justify-content: space-between; font-size: 12px; border-bottom: 8px solid black;">
        <div><strong>Serving Size</strong></div>
        <div><strong>${convertFormattingForHtml(convertTabsForHtml(servingSize))}</strong></div>
      </div>
      <div style="padding: 8px 10px; display:flex; justify-content: space-between; align-items: flex-end; border-bottom: 4px solid black;">
        <div style="font-size: 18px; font-weight: 800;">Amount per serving<br/><span style="font-size: 22px;">Calories</span></div>
        <div style="font-size: 42px; font-weight: 800; line-height: 1;">${convertFormattingForHtml(convertTabsForHtml(calories))}</div>
      </div>
      <div style="padding: 6px 10px; font-size: 11px; text-align: right; border-bottom: 1px solid black; font-weight: 700;">% Daily Value *</div>
      <table style="width: 100%; border-collapse: collapse;">
        <colgroup>
          <col style="width: 70%;" />
          <col style="width: 30%;" />
        </colgroup>
        <tbody>
    `;

    rows.forEach((row, index) => {
      const isLast = index === rows.length - 1;
      const border = isLast ? "1px solid black" : getThicknessBorderStyle(row.thickness || "normal");
      const indentPx = ((row.indentLevel ?? 0) * 16);
      const nameStyle = [row.bold ? "font-weight:700;" : "", row.italic ? "font-style:italic;" : "", indentPx ? `padding-left:${indentPx}px;` : ""].join("");
      html += `
          <tr style="border-bottom: ${border};">
            <td style="padding: 6px 10px; font-size: 12px; ${nameStyle}">${convertFormattingForHtml(convertTabsForHtml(row.nutrient))} ${row.amount ? convertFormattingForHtml(convertTabsForHtml(row.amount)) : ""}</td>
            <td style="padding: 6px 10px; font-size: 12px; text-align: right; font-weight: 700;">${convertFormattingForHtml(convertTabsForHtml(row.percentDv || ""))}</td>
          </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      <div style="padding: 8px 10px; font-size: 10px; border-top: 1px solid black;">
        *The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily diet. 2,000 calories a day is used for general nutrition advice.
      </div>

      <!-- Text Sections (AU functionality) -->
      <div class="text-sections" style="padding: 12px 10px;">
    `;

    textSections.forEach((section) => {
      html += `
        <div class="text-section" style="margin-bottom: 10px;">
          <h4 style="font-weight: bold; margin: 0 0 4px 0; font-size: 12px;">${convertFormattingForHtml(convertTabsForHtml(section.title))}</h4>
          <p style="margin: 0; font-size: 11px; line-height: 1.4;">${convertFormattingForHtml(convertTabsForHtml(section.content))}</p>
        </div>
      `;
    });

    html += `
      </div>
    </div>`;
    return html;
  }, [rows, servingsPerContainer, servingSize, calories, textSections]);

  const handleSave = useCallback(async () => {
    if (!product) {
      toast.error("Product information is required");
      return;
    }
    if (product?.variants && product.variants.length > 1 && !activeVariantId) {
      toast.error("Please select a variant before saving");
      return;
    }
    try {
      const content = {
        servingsPerContainer,
        servingSize,
        calories,
        rows,
        textSections,
      };
      const nipData = {
        productId: product._id,
        variantId: activeVariantId || undefined,
        templateType: "us_nutrition_facts",
        content,
        htmlContent: generateHtml(),
      };
      let result;
      if (currentVariantNip) {
        result = await updateNip({ nipId: currentVariantNip._id, ...nipData });
        toast.success("US Nutrition Facts NIP updated successfully!");
      } else {
        result = await createNip(nipData);
        toast.success("US Nutrition Facts NIP created successfully!");
      }
      setIsSaved(true);
      onSave(result);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save NIP. Please try again.");
    }
  }, [product, activeVariantId, servingsPerContainer, servingSize, calories, rows, currentVariantNip, createNip, updateNip, generateHtml, onSave]);

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">US Nutrition Facts NIP Builder</h2>
            <p className="text-sm text-gray-600 mt-1">
              {product?.title} {variant?.title && `- ${variant.title}`}
            </p>
          </div>
          <div className="flex items-center space-x-3">
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

        {isSaved && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center justify-between">
              <p className="text-sm text-green-700">NIP saved successfully!</p>
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

      <div className="flex-1 p-6 bg-white overflow-y-auto">
        {/* Toolbar: matches AU quick actions */}
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
          <button onClick={addCustomTextSection} className="px-3 py-1 text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded">
            + Add Text Section
          </button>
          <button onClick={addRow} className="px-3 py-1 text-xs bg-green-50 hover:bg-green-100 border border-green-200 rounded">
            + Add Row
          </button>
          {selectedTextId && selectedText && (
            <div className="flex items-center space-x-1 ml-4 pl-4 border-l border-gray-300">
              <span className="text-xs text-gray-600">Format:</span>
              <button onClick={() => applyFormatting("bold")} className="px-2 py-1 text-xs font-bold bg-gray-100 hover:bg-gray-200 rounded">B</button>
              <button onClick={() => applyFormatting("italic")} className="px-2 py-1 text-xs italic bg-gray-100 hover:bg-gray-200 rounded">I</button>
            </div>
          )}
        </div>

        {/* Two-column layout like AU builders */}
        <div className="flex gap-6">
          {/* Left: Text Sections */}
          <div className="flex-1 p-4 bg-white border rounded">
            <h3 className="text-lg font-semibold mb-3">Text Sections</h3>
            <DraggableTextSection
              sections={textSections}
              onSectionsReorder={handleTextSectionsReorder}
              onUpdateSection={updateTextSection}
              onDeleteSection={deleteTextSection}
              onTextSelect={(sectionId, element) => {
                if (element instanceof HTMLTextAreaElement) {
                  handleTextSelect(sectionId, element);
                }
              }}
            />
          </div>

          {/* Right: US Header editors + Table */}
          <div className="flex-1">
            {/* Header editors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <input
                className="border rounded px-2 py-1 text-sm"
                value={servingsPerContainer}
                onChange={(e) => setServingsPerContainer(e.target.value)}
                placeholder="Servings per container"
              />
              <input
                className="border rounded px-2 py-1 text-sm"
                value={servingSize}
                onChange={(e) => setServingSize(e.target.value)}
                placeholder="Serving Size"
              />
              <input
                className="border rounded px-2 py-1 text-sm"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="Calories"
              />
            </div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Nutrition Facts Rows</h4>
            </div>

            <div className="border rounded">
              <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-2/3" />
                <col className="w-1/3" />
              </colgroup>
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-2 py-1 text-xs font-medium">Nutrient & Amount</th>
                  <th className="text-right px-2 py-1 text-xs font-medium">% DV</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                  key={row.id}
                  draggable
                  onDragStart={(e) => rowDragHandlers.onDragStart(e, index)}
                  onDragOver={rowDragHandlers.onDragOver}
                  onDrop={(e) => rowDragHandlers.onDrop(e, index)}
                  onDragEnd={rowDragHandlers.onDragEnd}
                  className={`${getBorderClass(row.thickness)} hover:bg-gray-50 cursor-move ${
                    draggedIndex === index ? "opacity-50" : ""
                  }`}
                  style={draggedIndex === index ? getDragHandleStyles() : {}}
                >
                  <td className="px-1 py-1">
                    <div className="flex items-center gap-2">
                      <div style={{ paddingLeft: `${(row.indentLevel ?? 0) * 16}px` }} className="flex-1">
                      <FormattableTableInput
                        value={row.nutrient}
                        onChange={(v) => {
                          // Update text and derive indent from leading spaces/tabs (4 spaces = 1 level)
                          updateRow(row.id, "nutrient", v);
                          const match = /^([\t ]+)/.exec(v || "");
                          let spaces = 0;
                          if (match) {
                            const lead = match[1];
                            for (const ch of lead) spaces += ch === "\t" ? 4 : 1;
                          }
                          const level = Math.max(0, Math.floor(spaces / 4));
                          updateRow(row.id, "indentLevel", level as any);
                        }}
                        className={`w-full text-sm bg-transparent border-none outline-none ${row.bold ? "font-bold" : ""} ${row.italic ? "italic" : ""}`}
                        rowThickness={row.thickness || "normal"}
                        onThicknessChange={(t) => updateRow(row.id, "thickness", t)}
                      />
                      </div>
                      <FormattableTableInput
                        value={row.amount}
                        onChange={(v) => updateRow(row.id, "amount", v)}
                        className="w-28 text-sm bg-transparent border-none outline-none text-right"
                        rowThickness={row.thickness || "normal"}
                        onThicknessChange={(t) => updateRow(row.id, "thickness", t)}
                      />
                      <button
                        onClick={() => deleteRow(row.id)}
                        className="text-red-500 hover:text-red-700 text-xs ml-1"
                        aria-label="Delete row"
                      >
                        ×
                      </button>
                    </div>
                  </td>
                  <td className="px-1 py-1">
                    <FormattableTableInput
                      value={row.percentDv}
                      onChange={(v) => updateRow(row.id, "percentDv", v)}
                      className="w-full text-sm bg-transparent border-none outline-none text-right"
                      rowThickness={row.thickness || "normal"}
                      onThicknessChange={(t) => updateRow(row.id, "thickness", t)}
                    />
                  </td>
                </tr>
              ))}
              </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            {currentVariantNip ? "Update" : "Save"} NIP
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Preview
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
      {/* Tabbed Preview Modal */}
      {showPreview && (
        <TabbedPreviewModal
          title="US Nutrition Facts"
          isOpen={showPreview}
          productId={product._id}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
