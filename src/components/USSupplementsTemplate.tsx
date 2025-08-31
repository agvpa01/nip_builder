import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { FormattableTableInput } from "./FormattableTableInput";
import { TabbedPreviewModal } from "./TabbedPreviewModal";
import { convertFormattingForHtml, convertTabsForHtml } from "../lib/tabUtils";
import { getThicknessBorderStyle } from "../lib/utils";
import {
  createDragDropHandlers,
  getDragHandleStyles,
} from "../lib/dragDropUtils";
// Add Other Ingredients as a rich text field

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

export function USSupplementsTemplate({
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
    (nip) =>
      nip.variantId === activeVariantId && nip.templateType === "us_supplements"
  );

  // Header fields
  const [servingsPerContainer, setServingsPerContainer] = useState(
    "33 Servings per container"
  );
  const [servingSize, setServingSize] = useState("1 scoop (30g)");
  const [calories, setCalories] = useState("110");
  const [otherIngredients, setOtherIngredients] = useState("");
  const [dvFootnoteText, setDvFootnoteText] = useState(
    "*Percent Daily Values are based on a 2,000 calorie diet"
  );
  const [showDvFootnote, setShowDvFootnote] = useState(true);

  const [rows, setRows] = useState<USRow[]>([
    {
      id: "potassium",
      nutrient: "Potassium",
      amount: "120mg",
      percentDv: "2%",
    },
  ]);

  // No text sections beyond Other Ingredients

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
        if (c.servingsPerContainer)
          setServingsPerContainer(c.servingsPerContainer);
        if (c.servingSize) setServingSize(c.servingSize);
        if (c.calories) setCalories(c.calories);
        if (Array.isArray(c.rows)) setRows(c.rows);
        if (typeof c.otherIngredients === "string")
          setOtherIngredients(c.otherIngredients);
        if (typeof c.dvFootnoteText === "string")
          setDvFootnoteText(c.dvFootnoteText);
        if (typeof c.showDvFootnote === "boolean")
          setShowDvFootnote(c.showDvFootnote);
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
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
      );
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
    <div class="us-supplements" style="font-family: Arial, sans-serif; max-width: 300px; margin: 0 auto; background: white; border: 2px solid black;">
      <div style="font-weight: 800; font-size: 24px; text-align: left; padding: 8px 10px;">SUPPLEMENT FACTS</div>
      <div style="padding: 0 10px 0px 10px; display: flex; justify-content: flex-start; font-size: 12px; ">
        <div><strong>Serving Size: </strong></div>
        <div><strong>${convertFormattingForHtml(convertTabsForHtml(servingSize))}</strong></div>
      </div>
      <div style="padding: 0px 10px;">
        <div style="padding: 5px 0px; font-size: 12px; border-bottom: 8px solid black;"><strong>${convertFormattingForHtml(convertTabsForHtml(servingsPerContainer))}</strong></div>
      </div>

      <div style="padding: 5px 10px;">
      <table style="width: 100%; border-collapse: collapse;">
        <colgroup>
          <col style="width: 40%;" />
          <col style="width: 35%;" />
          <col style="width: 25%;" />
        </colgroup>
        <thead>
          <tr style="border-bottom: 3px solid black;">
            <th style="padding: 6px 10px; font-size: 12px; text-align: left;"></th>
            <th style="padding: 6px 10px; font-size: 11px; text-align: right;">Amount per serving</th>
            <th style="width: 35%; padding: 6px 10px; font-size: 12px; text-align: right;">%DV</th>
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach((row, index) => {
      const isLast = index === rows.length - 1;
      const border = isLast
        ? "1px solid black"
        : getThicknessBorderStyle(row.thickness || "normal");
      const indentPx = (row.indentLevel ?? 0) * 16;
      const nameStyle = [
        row.bold ? "font-weight:700;" : "",
        row.italic ? "font-style:italic;" : "",
        indentPx ? `padding-left:${indentPx}px;` : "",
      ].join("");
      html += `
          <tr style="border-bottom: ${border};">
            <td style="padding: 6px 10px; font-size: 12px; ${nameStyle}">${convertFormattingForHtml(convertTabsForHtml(row.nutrient))}</td>
            <td style="padding: 6px 10px; font-size: 12px; text-align: right;">${row.amount ? convertFormattingForHtml(convertTabsForHtml(row.amount)) : ""}</td>
            <td style="padding: 6px 10px; font-size: 12px; text-align: right;">${convertFormattingForHtml(convertTabsForHtml(row.percentDv || ""))}</td>
          </tr>
      `;
    });

    html += `
        </tbody>
      </table>
      </div>

       ${
         showDvFootnote && dvFootnoteText && dvFootnoteText.trim()
           ? `
      <div style="padding: 8px 10px 0px 10px; font-size: 11px; border-top: 5px solid black;">${convertFormattingForHtml(convertTabsForHtml(dvFootnoteText)).replace(/\n/g, "<br/>")}</div>
      `
           : ""
       }
      <div style="font-size: 12px; ${showDvFootnote && dvFootnoteText && dvFootnoteText.trim() ? "padding: 5px 10px 8px 10px; " : "padding: 8px 10px; border-top: 5px solid black;"}">
      ${showDvFootnote && dvFootnoteText && dvFootnoteText.trim() ? "*" : ""}*Daily Value (DV) not established.
      </div>
     
      <div style="background-color:black; color:white; padding: 8px 10px; font-size: 12px; border-top: 1px solid black;">
        Other Ingredients: ${
          otherIngredients && otherIngredients.trim()
            ? `
        ${convertFormattingForHtml(convertTabsForHtml(otherIngredients)).replace(/\n/g, "<br/>")}
      `
            : ""
        }
      </div>
    </div>`;
    return html;
  }, [
    rows,
    servingsPerContainer,
    servingSize,
    calories,
    otherIngredients,
    dvFootnoteText,
    showDvFootnote,
  ]);

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
        otherIngredients,
        dvFootnoteText,
        showDvFootnote,
      };
      const nipData = {
        productId: product._id,
        variantId: activeVariantId || undefined,
        templateType: "us_supplements",
        content,
        htmlContent: generateHtml(),
      };
      let result;
      if (currentVariantNip) {
        result = await updateNip({ nipId: currentVariantNip._id, ...nipData });
        toast.success("US Supplements NIP updated successfully!");
      } else {
        result = await createNip(nipData);
        toast.success("US Supplements NIP created successfully!");
      }
      setIsSaved(true);
      onSave(result);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save NIP. Please try again.");
    }
  }, [
    product,
    activeVariantId,
    servingsPerContainer,
    servingSize,
    calories,
    rows,
    currentVariantNip,
    createNip,
    updateNip,
    generateHtml,
    onSave,
  ]);

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              US Supplements NIP Builder
            </h2>
            <p className="mt-1 text-sm text-gray-600">
              {product?.title} {variant?.title && `- ${variant.title}`}
            </p>
            {product?.variants && product.variants.length > 1 && (
              <div className="mt-2">
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  Select Variant:
                </label>
                <select
                  value={activeVariantId || ""}
                  onChange={(e) => setActiveVariantId(e.target.value || null)}
                  className="block w-64 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
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
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSave}
              className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {currentVariantNip ? "Update" : "Save"} NIP
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Preview
            </button>
            <button
              onClick={onCancel}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>

        {isSaved && (
          <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-green-700">NIP saved successfully!</p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsSaved(false)}
                  className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
                >
                  Continue Editing
                </button>
                <button
                  onClick={() => onSave(null)}
                  className="rounded bg-gray-600 px-3 py-1 text-xs text-white hover:bg-gray-700"
                >
                  Back to NIPs
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-white p-6">
        {/* Header editors + Table */}
        <div className="flex-1">
          {/* Header editors */}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input
              className="rounded border px-2 py-1 text-sm"
              value={servingsPerContainer}
              onChange={(e) => setServingsPerContainer(e.target.value)}
              placeholder="Servings per container"
            />
            <input
              className="rounded border px-2 py-1 text-sm"
              value={servingSize}
              onChange={(e) => setServingSize(e.target.value)}
              placeholder="Serving Size"
            />
            <input
              className="rounded border px-2 py-1 text-sm"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="Calories"
            />
          </div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="font-medium">Nutrition Facts Rows</h4>
            <button
              onClick={addRow}
              className="rounded border border-green-200 bg-green-50 px-3 py-1 text-xs hover:bg-green-100"
            >
              + Add Row
            </button>
          </div>

          <div className="rounded border">
            <table className="w-full table-fixed border-collapse">
              <colgroup>
                <col className="w-2/3" />
                <col className="w-1/3" />
              </colgroup>
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-2 py-1 text-left text-xs font-medium">
                    Nutrient & Amount
                  </th>
                  <th className="px-2 py-1 text-right text-xs font-medium">
                    % DV
                  </th>
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
                    className={`${getBorderClass(row.thickness)} cursor-move hover:bg-gray-50 ${
                      draggedIndex === index ? "opacity-50" : ""
                    }`}
                    style={draggedIndex === index ? getDragHandleStyles() : {}}
                  >
                    <td className="px-1 py-1">
                      <div className="flex items-center gap-2">
                        <div
                          style={{
                            paddingLeft: `${(row.indentLevel ?? 0) * 16}px`,
                          }}
                          className="flex-1"
                        >
                          <FormattableTableInput
                            value={row.nutrient}
                            onChange={(v) => {
                              // Update text and derive indent from leading spaces/tabs (4 spaces = 1 level)
                              updateRow(row.id, "nutrient", v);
                              const match = /^([\t ]+)/.exec(v || "");
                              let spaces = 0;
                              if (match) {
                                const lead = match[1];
                                for (const ch of lead)
                                  spaces += ch === "\t" ? 4 : 1;
                              }
                              const level = Math.max(0, Math.floor(spaces / 4));
                              updateRow(row.id, "indentLevel", level as any);
                            }}
                            className={`w-full border-none bg-transparent text-sm outline-none ${row.bold ? "font-bold" : ""} ${row.italic ? "italic" : ""}`}
                            rowThickness={row.thickness || "normal"}
                            onThicknessChange={(t) =>
                              updateRow(row.id, "thickness", t)
                            }
                          />
                        </div>
                        <FormattableTableInput
                          value={row.amount}
                          onChange={(v) => updateRow(row.id, "amount", v)}
                          className="w-28 border-none bg-transparent text-right text-sm outline-none"
                          rowThickness={row.thickness || "normal"}
                          onThicknessChange={(t) =>
                            updateRow(row.id, "thickness", t)
                          }
                        />
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="ml-1 text-xs text-red-500 hover:text-red-700"
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
                        className="w-full border-none bg-transparent text-right text-sm outline-none"
                        rowThickness={row.thickness || "normal"}
                        onThicknessChange={(t) =>
                          updateRow(row.id, "thickness", t)
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Other Ingredients rich text editor */}
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Other Ingredients
            </label>
            <div className="rounded border p-2">
              <FormattableTableInput
                value={otherIngredients}
                onChange={setOtherIngredients}
                className="min-h-24 w-full border-none bg-transparent text-sm outline-none"
                placeholder="Other Ingredients... (select text to Bold/Italic)"
                allowNewLines
              />
            </div>
          </div>

          {/* Daily Value footnote editor with show/hide */}
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Additional Daily Value Footnote
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showDvFootnote}
                  onChange={(e) => setShowDvFootnote(e.target.checked)}
                />
                <span>Show under "*Daily Value (DV) not established."</span>
              </label>
            </div>
            <div className="rounded border p-2">
              <FormattableTableInput
                value={dvFootnoteText}
                onChange={setDvFootnoteText}
                className="min-h-16 w-full border-none bg-transparent text-sm outline-none"
                placeholder="*Percent Daily Values are based on a 2,000 calorie diet"
                allowNewLines
              />
            </div>
          </div>
        </div>

        {/* <div className="mt-4 flex gap-2">
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
        </div> */}
      </div>
      {showPreview && (
        <TabbedPreviewModal
          title="US Supplements"
          isOpen={showPreview}
          productId={product._id}
          templateType="us_supplements"
          variants={product.variants}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
