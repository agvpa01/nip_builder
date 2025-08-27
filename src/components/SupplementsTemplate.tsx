import React, { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { PreviewModal } from "./PreviewModal";
import { FormattableTableInput } from "./FormattableTableInput";
import { getThicknessBorderStyle } from "../lib/utils";
import { convertTabsForHtml, convertFormattingForHtml } from "../lib/tabUtils";

interface SupplementsTemplateProps {
  product: any;
  variant?: any;
  currentNip: any;
  onSave: (nip: any) => void;
  onCancel: () => void;
}

interface NutritionalRow {
  id: string;
  nutrient: string;
  perServe: string;
  per100g: string;
}

export function SupplementsTemplate({
  product,
  variant,
  currentNip,
  onSave,
  onCancel,
}: SupplementsTemplateProps) {
  // Variant support
  const [activeVariantId, setActiveVariantId] = useState<string | null>(
    variant?._id || null
  );
  const [showPreview, setShowPreview] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Serving information
  const [servingSize, setServingSize] = useState("1g");
  const [servingsPerBottle, setServingsPerBottle] = useState("200");

  // Query NIPs for all variants of this product
  const productNips = useQuery(
    api.nips.getNipsByProduct,
    product ? { productId: product._id } : "skip"
  );

  // Get current variant NIP
  const currentVariantNip = productNips?.find(
    (nip) => nip.variantId === activeVariantId
  );

  // Text sections removed - keeping only nutritional information table

  // Initialize nutritional information table
  const [nutritionalRows, setNutritionalRows] = useState<NutritionalRow[]>([
    {
      id: "serving-info",
      nutrient: "Serving Size: 1 capsule",
      perServe: "Servings per Container: 60",
      per100g: "",
    },
  ]);

  // Thickness state
  const [nutritionalRowThickness, setNutritionalRowThickness] = useState<
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
        if (content.nutritionalRows)
          setNutritionalRows(content.nutritionalRows);
        if (content.nutritionalRowThickness)
          setNutritionalRowThickness(content.nutritionalRowThickness);
        if (content.servingSize) setServingSize(content.servingSize);
        if (content.servingsPerBottle)
          setServingsPerBottle(content.servingsPerBottle);
      } catch (error) {
        console.error("Error loading NIP content:", error);
      }
    }
  }, [currentVariantNip]);

  // Supplement facts table removed - keeping only nutritional information

  // Removed text selection state variables as they are no longer needed

  const createNip = useAction(api.nips.createNipWithTabbedFile as any);
  const updateNip = useAction(api.nips.updateNipWithTabbedFile as any);

  // Text section functions removed

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

  // Ingredient row functions removed

  // Text selection and formatting functions removed

  // Generate HTML output
  const generateHtml = useCallback(() => {
    const thicknessBorder = getThicknessBorderStyle(nutritionalRowThickness);

    let html = `
    <div class="supplements-nip" style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; background: white; border: 2px solid black; border-radius: 8px; overflow: hidden;">
      <!-- Nutritional Information Table -->
      <div class="nutritional-info">
        <div class="table-header" style="background-color: black; color: white; text-align: center; font-weight: bold; font-size: 18px;">
          NUTRITIONAL INFORMATION
        </div>
        <!-- Serving Information -->
        <div style="padding: 12px; border-bottom: 1px solid black; background: white;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold;">
            <span>Serving Size: ${servingSize}</span>
            <span>Servings per Bottle: ${servingsPerBottle}</span>
          </div>
        </div>
        <!-- Column Headers -->
        <div style="padding: 12px; border-bottom: 2px solid black; background: white;">
          <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold;">
            <span style="flex: 1; text-align: right;">Per Serve</span>
            <span style="flex: 1; text-align: right;">Per 100g</span>
          </div>
        </div>
        <table style="width: 100%; table-layout: fixed; border-collapse: collapse;">
            <colgroup>
              <col style="width: 50%;" />
              <col style="width: 50%;" />
            </colgroup>
            <tbody>
    `;

    // Add nutritional rows
    nutritionalRows.forEach((row, index) => {
      const bgColor = index % 2 === 0 ? "white" : "#f9f9f9";
      html += `
          <tr style="background-color: ${bgColor}; border-bottom: 1px solid black;">
            <td colspan="2" style="padding: 8px 12px; font-size: 14px; font-weight: 500; border-bottom: 1px solid #ddd;">${convertFormattingForHtml(convertTabsForHtml(row.nutrient))}</td>
          </tr>
          <tr style="background-color: ${bgColor};">
            <td style="padding: 8px 12px; font-size: 14px; text-align: right; font-weight: 500; border-right: 1px solid black;">${convertFormattingForHtml(convertTabsForHtml(row.perServe))}</td>
            <td style="padding: 8px 12px; font-size: 14px; text-align: right; font-weight: 500;">${convertFormattingForHtml(convertTabsForHtml(row.per100g))}</td>
          </tr>
       `;
    });

    html += `
            </tbody>
        </table>
      </div>
    </div>
    `;

    return html;
  }, [
    nutritionalRows,
    nutritionalRowThickness,
    servingSize,
    servingsPerBottle,
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
        templateType: "supplements",
        content: {
          nutritionalRows,
          nutritionalRowThickness,
          servingSize,
          servingsPerBottle,
        },
        htmlContent: generateHtml(),
      };

      if (currentVariantNip?._id) {
        const result = await updateNip({
          nipId: currentVariantNip._id,
          productId: nipData.productId,
          templateType: nipData.templateType,
          content: nipData.content,
          htmlContent: nipData.htmlContent,
          variantId: nipData.variantId as any, // Cast to any to resolve type mismatch
        });
        if (result.success) {
          toast.success(
            result.message +
              (result.fileUrl ? ` File URL: ${result.fileUrl}` : "")
          );
        } else {
          toast.error(result.message);
        }
      } else {
        const result = await createNip({
          productId: nipData.productId,
          variantId: nipData.variantId as any, // Cast to match expected Id type
          templateType: nipData.templateType,
          content: nipData.content,
          htmlContent: nipData.htmlContent,
        });
        if (result.success) {
          toast.success(
            result.message +
              (result.fileUrl ? ` File URL: ${result.fileUrl}` : "")
          );
        } else {
          toast.error(result.message);
        }
      }
      setIsSaved(true);
    } catch (error) {
      toast.error("Failed to save NIP");
      console.error(error);
    }
  }, [
    product,
    activeVariantId,
    currentVariantNip,
    nutritionalRows,
    generateHtml,
    createNip,
    updateNip,
    onSave,
  ]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-800">Supplements NIP Builder</h1>
            <div className="text-sm text-gray-600">
              {product?.title}
              {activeVariantId && (
                <span className="ml-2">
                  - {product.variants?.find((v: any) => v._id === activeVariantId)?.title || "Selected Variant"}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPreview(true)}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md"
            >
              Preview
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            >
              Update NIP
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Success Message */}
        {isSaved && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-green-600 font-semibold">✓ NIP Saved Successfully!</div>
            <p className="text-green-700 text-sm mt-1">
              Your Supplements NIP has been saved for {product?.title}
            </p>
          </div>
        )}

        {/* Variant Selection */}
        {product?.variants && product.variants.length > 1 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Variant:
            </label>
            <select
              value={activeVariantId || ""}
              onChange={(e) => setActiveVariantId(e.target.value)}
              className="w-64 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {product.variants.map(
                (v: { _id: string; title?: string; sku?: string }) => (
                  <option key={v._id} value={v._id}>
                    {v.title || "Unnamed Variant"} {v.sku ? `- ${v.sku}` : ""}
                  </option>
                )
              )}
            </select>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Quick Actions:</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={addNutritionalRow}
              className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md"
            >
              + Add Nutritional Row
            </button>
            <button
              onClick={() => {}}
              className="px-3 py-1 text-sm bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md font-bold"
            >
              B
            </button>
            <button
              onClick={() => {}}
              className="px-3 py-1 text-sm bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-md italic"
            >
              I
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar for serving info */}
        <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto">

          <h3 className="text-lg font-semibold mb-4">Serving Information</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Serving Size:
              </label>
              <input
                type="text"
                value={servingSize}
                onChange={(e) => setServingSize(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 1g"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Servings per Bottle:
              </label>
              <input
                type="text"
                value={servingsPerBottle}
                onChange={(e) => setServingsPerBottle(e.target.value)}
                className="w-full p-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 200"
              />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 bg-white overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Nutritional Information</h3>

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
          <div className="bg-black text-white text-center font-bold text-lg">
            NUTRITIONAL INFORMATION
          </div>
          {/* Serving Information */}
          <div className="px-3 py-3 border-b border-black bg-white">
            <div className="flex justify-between text-xs font-bold">
              <span>Serving Size: {servingSize}</span>
              <span>Servings per Bottle: {servingsPerBottle}</span>
            </div>
          </div>
          {/* Column Headers */}
          <div className="px-3 py-3 border-b-2 border-black bg-white">
            <div className="flex justify-between text-sm font-bold">
              <span className="flex-1 text-right">Per Serve</span>
              <span className="flex-1 text-right">Per 100g</span>
            </div>
          </div>

          <table className="w-full table-fixed border-collapse">
            <colgroup>
              <col className="w-2/3" />
              <col className="w-1/6" />
              <col className="w-1/6" />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-2 py-1 text-xs font-medium">Nutrient</th>
                <th className="text-right px-2 py-1 text-xs font-medium">Per Serve</th>
                <th className="text-right px-2 py-1 text-xs font-medium">Per 100g</th>
              </tr>
            </thead>
            <tbody>
              {nutritionalRows.map((row, index) => (
                <React.Fragment key={row.id}>
                  <tr
                    className={`${getBorderClass(nutritionalRowThickness)} ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100 border-b border-black`}
                  >
                    <td className="px-0 py-0">
                      <FormattableTableInput
                        value={row.nutrient}
                        onChange={(value) =>
                          updateNutritionalRow(row.id, "nutrient", value)
                        }
                        className="w-full text-sm bg-transparent border-none outline-none font-medium"
                        disabled={
                          product?.variants &&
                          product.variants.length > 1 &&
                          !activeVariantId
                        }
                        rowThickness={nutritionalRowThickness}
                        onThicknessChange={setNutritionalRowThickness}
                      />
                    </td>
                    <td className="px-0 py-0">
                      <FormattableTableInput
                        value={row.perServe}
                        onChange={(value) =>
                          updateNutritionalRow(row.id, "perServe", value)
                        }
                        className="w-full text-sm bg-transparent border-none outline-none text-right font-medium"
                        disabled={
                          product?.variants &&
                          product.variants.length > 1 &&
                          !activeVariantId
                        }
                        rowThickness={nutritionalRowThickness}
                        onThicknessChange={setNutritionalRowThickness}
                      />
                    </td>
                    <td className="px-0 py-0">
                      <FormattableTableInput
                        value={row.per100g}
                        onChange={(value) =>
                          updateNutritionalRow(row.id, "per100g", value)
                        }
                        className="w-full text-sm bg-transparent border-none outline-none text-right font-medium"
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
                  <tr>
                    <td colSpan={3} className="px-0 py-0">
                      <button
                        onClick={() => deleteNutritionalRow(row.id)}
                        className="text-red-500 hover:text-red-700 text-xs"
                      >
                        × Delete {row.nutrient || "Row"}
                      </button>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal
          title="Supplements NIP Preview"
          isOpen={showPreview}
          htmlContent={generateHtml()}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
