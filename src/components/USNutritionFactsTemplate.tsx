import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { FormattableTableInput } from "./FormattableTableInput";
import { convertFormattingForHtml, convertTabsForHtml } from "../lib/tabUtils";
import { getThicknessBorderStyle } from "../lib/utils";
import { createDragDropHandlers, getDragHandleStyles } from "../lib/dragDropUtils";

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
  indent?: boolean; // sub-item (e.g., Saturated Fat)
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
    { id: "fat-sat", nutrient: "Saturated Fat", amount: "0g", percentDv: "0%", indent: true },
    { id: "fat-trans", nutrient: "Trans Fat", amount: "0g", percentDv: "", indent: true, italic: true },
    { id: "chol", nutrient: "Cholesterol", amount: "0mg", percentDv: "0%" },
    { id: "sodium", nutrient: "Sodium", amount: "60mg", percentDv: "3%", thickness: "medium-thick" },
    { id: "carb-total", nutrient: "Total Carbohydrate", amount: "2g", percentDv: "1%", thickness: "medium-thick", bold: true },
    { id: "fiber", nutrient: "Dietary Fiber", amount: "0g", percentDv: "0%", indent: true },
    { id: "sugars-total", nutrient: "Total Sugars", amount: "1g", percentDv: "", indent: true, bold: true },
    { id: "sugars-added", nutrient: "Includes Added Sugars", amount: "0g", percentDv: "", indent: true },
    { id: "protein", nutrient: "Protein", amount: "26g", percentDv: "", thickness: "large-thick", bold: true },
    { id: "vit-d", nutrient: "Vitamin D", amount: "0mcg", percentDv: "0%" },
    { id: "calcium", nutrient: "Calcium", amount: "130mg", percentDv: "10%" },
    { id: "iron", nutrient: "Iron", amount: "0mg", percentDv: "0%" },
    { id: "potassium", nutrient: "Potassium", amount: "120mg", percentDv: "2%" },
  ]);

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
      const nameStyle = [row.bold ? "font-weight:700;" : "", row.italic ? "font-style:italic;" : "", row.indent ? "padding-left:16px;" : ""].join("");
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
    </div>`;
    return html;
  }, [rows, servingsPerContainer, servingSize, calories]);

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
          <button onClick={addRow} className="text-sm text-blue-600 hover:text-blue-800">+ Add Row</button>
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
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!row.indent}
                        onChange={(e) => updateRow(row.id, "indent", e.target.checked)}
                        title="Indent"
                      />
                      <FormattableTableInput
                        value={row.nutrient}
                        onChange={(v) => updateRow(row.id, "nutrient", v)}
                        className={`flex-1 text-sm bg-transparent border-none outline-none ${row.bold ? "font-bold" : ""} ${row.italic ? "italic" : ""}`}
                        rowThickness={row.thickness || "normal"}
                        onThicknessChange={(t) => updateRow(row.id, "thickness", t)}
                      />
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

        <div className="mt-4 flex gap-2">
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
    </div>
  );
}

