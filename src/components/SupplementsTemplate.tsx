import React, { useState, useCallback, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { PreviewModal } from "./PreviewModal";
import { FormattableTableInput } from "./FormattableTableInput";
import { getThicknessBorderStyle } from "../lib/utils";

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
  const [nutritionalRowThickness, setNutritionalRowThickness] = useState<'normal' | 'thick' | 'medium-thick' | 'large-thick' | 'extra-large-thick'>('normal');

  // Utility function to get border class based on thickness
  const getBorderClass = (thickness: 'normal' | 'thick' | 'medium-thick' | 'large-thick' | 'extra-large-thick') => {
    switch (thickness) {
      case 'normal':
        return 'border-b';
      case 'thick':
        return 'border-b-2';
      case 'medium-thick':
        return 'border-b-4';
      case 'large-thick':
        return 'border-b-8';
      case 'extra-large-thick':
        return 'border-b-8 border-double';
      default:
        return 'border-b';
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
    <div class="supplements-nip" style="font-family: Arial, sans-serif; max-width: 400px; margin: 0 auto; background: white;">
      <!-- Nutritional Information Table -->
      <div class="nutritional-info">
        <div class="table-header" style="background: black; color: white; text-align: center; padding: 8px; font-weight: bold; font-size: 12px;">
          NUTRITIONAL INFORMATION
        </div>
        <table style="width: 100%; border-collapse: collapse; border: 2px solid black;">
    `;

    // Add nutritional table headers
    html += `
          <tr style="border-bottom: ${thicknessBorder};">
            <td style="padding: 4px 8px; font-size: 10px; border-right: 1px solid black;"></td>
            <td style="padding: 4px 8px; font-size: 10px; text-align: right; border-right: 1px solid black;">Per Serve</td>
            <td style="padding: 4px 8px; font-size: 10px; text-align: right;">Per 100g</td>
          </tr>
    `;

    // Add nutritional rows
    nutritionalRows.forEach((row) => {
      html += `
          <tr style="border-bottom: ${thicknessBorder};">
            <td style="padding: 4px 8px; font-size: 10px; border-right: 1px solid black;">${row.nutrient}</td>
            <td style="padding: 4px 8px; font-size: 10px; text-align: right; border-right: 1px solid black;">${row.perServe}</td>
            <td style="padding: 4px 8px; font-size: 10px; text-align: right;">${row.per100g}</td>
          </tr>
    `;
    });

    html += `
        </table>
      </div>
    </div>
    `;

    return html;
  }, [nutritionalRows, nutritionalRowThickness]);

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
    <div className="flex h-screen bg-gray-50">
      {/* Toolbar */}
      <div className="w-80 bg-white border-r border-gray-200 p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Supplements NIP</h3>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Current Variant Indicator */}
        {activeVariantId && (
          <div className="mb-4 p-3 bg-green-50 border-l-4 border-green-400 rounded">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-green-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Editing Variant
                </p>
                <p className="text-sm text-green-700">
                  {product?.variants?.find(
                    (v: any) => v._id === activeVariantId
                  )?.title ||
                    product?.variants?.find(
                      (v: any) => v._id === activeVariantId
                    )?.name ||
                    "Selected Variant"}
                </p>
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
              onChange={(e) => setActiveVariantId(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {product.variants.map(
                (v: { _id: string; title?: string; sku?: string }) => (
                  <option key={v._id} value={v._id}>
                    {v.title || "Unnamed Variant"} {v.sku ? `- ${v.sku}` : ""}
                  </option>
                )
              )}
            </select>
            {productNips && productNips.length > 0 && (
              <div className="mt-2 text-xs text-gray-600">
                Existing NIPs:{" "}
                {productNips.filter((nip) => nip.variantId === activeVariantId)
                  .length > 0
                  ? "Found"
                  : "None"}
              </div>
            )}
          </div>
        )}

        {/* Text formatting tools removed */}

        {/* Actions */}
        {isSaved ? (
          <div className="space-y-4 mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-center">
              <div className="text-green-600 text-lg font-semibold mb-2">
                ✓ NIP Saved Successfully!
              </div>
              <p className="text-green-700 text-sm mb-4">
                Your Supplements NIP has been saved for {product?.title}
                {activeVariantId && (
                  <span>
                    {" - "}
                    {product?.variants?.find(
                      (v: any) => v._id === activeVariantId
                    )?.name ||
                      product?.variants?.find(
                        (v: any) => v._id === activeVariantId
                      )?.title ||
                      "Selected Variant"}
                  </span>
                )}
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setIsSaved(false)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
              >
                Continue Editing
              </button>
              <button
                onClick={() => onSave(null)}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium"
              >
                Back to NIPs
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 mb-6">
            <button
              onClick={handleSave}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
            >
              Save NIP
            </button>
            <button
              onClick={() => setShowPreview(true)}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
            >
              Preview
            </button>
            <button
              onClick={onCancel}
              className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Add Buttons */}
        <div className="space-y-2">
          <button
            onClick={addNutritionalRow}
            className="w-full px-3 py-2 text-sm bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded"
          >
            + Add Nutritional Row
          </button>
        </div>
      </div>

      {/* Main Content */}
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

        <div className="border border-gray-300 rounded overflow-hidden">
          <div className="bg-black text-white text-center py-2 font-semibold text-sm">
            NUTRITIONAL INFORMATION
          </div>

          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-2 text-xs font-medium">Nutrient</th>
                <th className="text-right p-2 text-xs font-medium">
                  Per Serve
                </th>
                <th className="text-right p-2 text-xs font-medium">Per 100g</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {nutritionalRows.map((row) => (
                    <tr key={row.id} className={`${getBorderClass(nutritionalRowThickness)} hover:bg-gray-50`}>
                  <td className="p-2">
                    <FormattableTableInput
                      value={row.nutrient}
                      onChange={(value) =>
                        updateNutritionalRow(row.id, "nutrient", value)
                      }
                      className="w-full text-xs bg-transparent border-none outline-none"
                      disabled={
                        product?.variants &&
                        product.variants.length > 1 &&
                        !activeVariantId
                      }
                      rowThickness={nutritionalRowThickness}
                      onThicknessChange={setNutritionalRowThickness}
                    />
                  </td>
                  <td className="p-2">
                    <FormattableTableInput
                      value={row.perServe}
                      onChange={(value) =>
                        updateNutritionalRow(row.id, "perServe", value)
                      }
                      className="w-full text-xs bg-transparent border-none outline-none text-right"
                      disabled={
                        product?.variants &&
                        product.variants.length > 1 &&
                        !activeVariantId
                      }
                      rowThickness={nutritionalRowThickness}
                      onThicknessChange={setNutritionalRowThickness}
                    />
                  </td>
                  <td className="p-2">
                    <FormattableTableInput
                      value={row.per100g}
                      onChange={(value) =>
                        updateNutritionalRow(row.id, "per100g", value)
                      }
                      className="w-full text-xs bg-transparent border-none outline-none text-right"
                      disabled={
                        product?.variants &&
                        product.variants.length > 1 &&
                        !activeVariantId
                      }
                      rowThickness={nutritionalRowThickness}
                      onThicknessChange={setNutritionalRowThickness}
                    />
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => deleteNutritionalRow(row.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
