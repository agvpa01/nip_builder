import React, { useState, useCallback, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { DraggableTextSection } from "./DraggableTextSection";
import { PreviewModal } from "./PreviewModal";
import { FormattableTableInput } from "./FormattableTableInput";
import { getThicknessBorderStyle } from "../lib/utils";
import { convertTabsForHtml } from "../lib/tabUtils";

interface ProteinPowderTemplateProps {
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
  thickness?: 'normal' | 'thick' | 'medium-thick' | 'large-thick' | 'extra-large-thick';
}

interface AminoAcidRow {
  id: string;
  aminoAcid: string;
  amount: string;
  thickness?: 'normal' | 'thick' | 'medium-thick' | 'large-thick' | 'extra-large-thick';
}

export function ProteinPowderTemplate({
  product,
  variant,
  currentNip,
  onSave,
  onCancel,
}: ProteinPowderTemplateProps) {
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

  // Initialize default text sections
  const [textSections, setTextSections] = useState<TextSection[]>([
    {
      id: "directions",
      title: "DIRECTIONS:",
      content:
        "Add 1 heaped scoop (30g) to 200mL of water or low fat milk. Stir or shake for 20 seconds, or until completely dispersed.",
      isCustom: false,
    },
    {
      id: "serving-size",
      title: "SERVING SIZE:",
      content: "30 grams",
      isCustom: false,
    },
    {
      id: "allergen",
      title: "ALLERGEN ADVICE:",
      content: "Contains Milk and less than 1% Soy Lecithin (as instantiser).",
      isCustom: false,
    },
    {
      id: "storage",
      title: "STORAGE:",
      content:
        "To maximise freshness, keep sealed and store in a cool dry place out of direct sunlight.",
      isCustom: false,
    },
    {
      id: "supplementary",
      title: "SUPPLEMENTARY INFO:",
      content:
        "FORMULATED SUPPLEMENTARY SPORTS FOOD. This product can be used as a sole source of nutrition. It must be used in conjunction with a balanced diet and a suitable physical training or exercise program. Not suitable for children under 15 years of age. Not suitable for pregnant women. Should only be used under medical or dietetic supervision.",
      isCustom: false,
    },
    {
      id: "serving-scoop",
      title: "SERVING SCOOP INFO:",
      content:
        "SERVING SCOOP INCLUDED, but may settle to the bottom of the bag during transit. Content sold by weight not volume, some settling may occur.",
      isCustom: false,
    },
    {
      id: "ingredients",
      title: "INGREDIENTS:",
      content:
        "Whey Protein Isolate (Milk)(Emulsifier (Soy Lecithin)), Flavour, Xanthan, Sucralose.",
      isCustom: false,
    },
  ]);

  // Initialize nutritional information table
  const [nutritionalRows, setNutritionalRows] = useState<NutritionalRow[]>([
    {
      id: "serving-info",
      nutrient: "Serving Size: 30 grams",
      perServe: "Servings per Pack: 33",
      per100g: "",
    },
  ]);

  // Load existing NIP data when variant changes
  useEffect(() => {
    if (currentVariantNip && currentVariantNip.content) {
      try {
        const content = currentVariantNip.content;
        if (content.textSections) setTextSections(content.textSections);
        if (content.nutritionalRows)
          setNutritionalRows(content.nutritionalRows);
        if (content.aminoAcidRows) setAminoAcidRows(content.aminoAcidRows);

      } catch (error) {
        console.error("Error loading NIP content:", error);
      }
    }
  }, [currentVariantNip]);

  // Initialize amino acid profile table
  const [aminoAcidRows, setAminoAcidRows] = useState<AminoAcidRow[]>([
    { id: "alanine", aminoAcid: "Alanine (mg)", amount: "5.010" },
    { id: "arginine", aminoAcid: "Arginine (mg)", amount: "2.160" },
    { id: "aspartic", aminoAcid: "Aspartic acid (mg)", amount: "10.500" },
    { id: "cysteine", aminoAcid: "Cysteine (mg)", amount: "2.430" },
    { id: "glutamic", aminoAcid: "Glutamic acid (mg)", amount: "17.000" },
    { id: "glycine", aminoAcid: "Glycine (mg)", amount: "1.620" },
    { id: "histidine", aminoAcid: "Histidine (mg)", amount: "1.550" },
    { id: "isoleucine", aminoAcid: "Isoleucine (mg)*", amount: "6.340" },
    { id: "leucine", aminoAcid: "Leucine (mg)*", amount: "10.300" },
    { id: "lysine", aminoAcid: "Lysine (mg)", amount: "10.000" },
    { id: "methionine", aminoAcid: "Methionine (mg)", amount: "2.150" },
    { id: "phenylalanine", aminoAcid: "Phenylalanine (mg)", amount: "2.560" },
    { id: "proline", aminoAcid: "Proline (mg)", amount: "6.050" },
    { id: "serine", aminoAcid: "Serine (mg)", amount: "4.590" },
    { id: "threonine", aminoAcid: "Threonine (mg)", amount: "6.710" },
    { id: "tryptophan", aminoAcid: "Tryptophan (mg)", amount: "2.300" },
    { id: "tyrosine", aminoAcid: "Tyrosine (mg)", amount: "2.840" },
    { id: "valine", aminoAcid: "Valine (mg)*", amount: "5.450" },
    { id: "bcaas", aminoAcid: "BCAAs* = 5.832 mg per serve", amount: "" },
  ]);

  // Individual row thickness update functions
  const updateNutritionalRowThickness = useCallback((rowId: string, thickness: 'normal' | 'thick' | 'medium-thick' | 'large-thick' | 'extra-large-thick') => {
    setNutritionalRows(prev => prev.map(row => 
      row.id === rowId ? { ...row, thickness } : row
    ));
  }, []);

  const updateAminoAcidRowThickness = useCallback((rowId: string, thickness: 'normal' | 'thick' | 'medium-thick' | 'large-thick' | 'extra-large-thick') => {
    setAminoAcidRows(prev => prev.map(row => 
      row.id === rowId ? { ...row, thickness } : row
    ));
  }, []);



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

  // Add amino acid row
  const addAminoAcidRow = useCallback(() => {
    const newRow: AminoAcidRow = {
      id: `amino-${Date.now()}`,
      aminoAcid: "New Amino Acid (mg)",
      amount: "0.000",
    };
    setAminoAcidRows((prev) => [...prev, newRow]);
  }, []);

  // Update amino acid row
  const updateAminoAcidRow = useCallback(
    (id: string, field: keyof AminoAcidRow, value: string) => {
      setAminoAcidRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
      );
    },
    []
  );

  // Delete amino acid row
  const deleteAminoAcidRow = useCallback((id: string) => {
    setAminoAcidRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  // Handle text selection for formatting
  const handleTextSelect = useCallback((textareaRef: HTMLTextAreaElement) => {
    setSelectionStart(textareaRef.selectionStart);
    setSelectionEnd(textareaRef.selectionEnd);
    setSelectedText(
      textareaRef.value.substring(
        textareaRef.selectionStart,
        textareaRef.selectionEnd
      )
    );
  }, []);

  // Apply text formatting
  const applyFormatting = useCallback(
    (sectionId: string, format: "bold" | "italic") => {
      const section = textSections.find((s) => s.id === sectionId);
      if (!section || selectionStart === selectionEnd) return;

      const beforeText = section.content.substring(0, selectionStart);
      const selectedText = section.content.substring(
        selectionStart,
        selectionEnd
      );
      const afterText = section.content.substring(selectionEnd);

      const formatTag = format === "bold" ? "strong" : "em";
      const formattedText = `<${formatTag}>${selectedText}</${formatTag}>`;
      const newContent = beforeText + formattedText + afterText;

      updateTextSection(sectionId, "content", newContent);
    },
    [textSections, selectionStart, selectionEnd, updateTextSection]
  );

  // Generate HTML output
  const generateHtml = useCallback(() => {
    let html = `
    <div class="protein-powder-nip" style="display: flex; font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; background: white;">
      <!-- Left Column: Text Sections -->
      <div class="left-column" style="flex: 1; padding: 20px; padding-right: 10px;">
    `;

    // Add text sections
    textSections.forEach((section) => {
      html += `
        <div class="text-section" style="margin-bottom: 16px;">
          <h4 style="font-weight: bold; margin: 0 0 4px 0; font-size: 12px;">${convertTabsForHtml(section.title)}</h4>
          <p style="margin: 0; font-size: 11px; line-height: 1.4;">${convertTabsForHtml(section.content)}</p>
        </div>
      `;
    });

    html += `
      </div>
      
      <!-- Right Column: Tables -->
      <div class="right-column" style="flex: 1; padding: 20px; padding-left: 10px;">
        <!-- Nutritional Information Table -->
        <div class="nutritional-info" style="margin-bottom: 20px;">
          <div class="table-header" style="background: black; color: white; text-align: center; padding: 8px; font-weight: bold; font-size: 12px;">
            NUTRITIONAL INFORMATION
          </div>
          <table style="width: 100%; border-collapse: collapse; border: 2px solid black;">
    `;

    // Add nutritional table headers
    html += `
            <tr style="border-bottom: 1px solid black;">
              <td style="padding: 4px 8px; font-size: 10px; border-right: 1px solid black;"></td>
              <td style="padding: 4px 8px; font-size: 10px; text-align: right; border-right: 1px solid black;">Per Serve</td>
              <td style="padding: 4px 8px; font-size: 10px; text-align: right;">Per 100g</td>
            </tr>
    `;

    // Add nutritional rows
    nutritionalRows.forEach((row) => {
      const rowThicknessBorder = getThicknessBorderStyle(row.thickness || 'normal');
      html += `
            <tr style="border-bottom: ${rowThicknessBorder};">
              <td style="padding: 4px 8px; font-size: 10px; border-right: 1px solid black;">${convertTabsForHtml(row.nutrient)}</td>
              <td style="padding: 4px 8px; font-size: 10px; text-align: right; border-right: 1px solid black;">${convertTabsForHtml(row.perServe)}</td>
              <td style="padding: 4px 8px; font-size: 10px; text-align: right;">${convertTabsForHtml(row.per100g)}</td>
            </tr>
      `;
    });

    html += `
          </table>
        </div>
        
        <!-- Amino Acid Profile Table -->
        <div class="amino-acid-profile">
          <div class="table-header" style="background: black; color: white; text-align: center; padding: 8px; font-weight: bold; font-size: 12px;">
            TYPICAL AMINO ACID PROFILE
          </div>
          <div style="text-align: center; padding: 4px; font-size: 10px; border: 2px solid black; border-bottom: 1px solid black;">
            Per 100g of Protein
          </div>
          <table style="width: 100%; border-collapse: collapse; border: 2px solid black; border-top: none;">
    `;

    // Add amino acid rows
    aminoAcidRows.forEach((row) => {
      const rowThicknessBorder = getThicknessBorderStyle(row.thickness || 'normal');
      if (row.amount) {
        html += `
            <tr style="border-bottom: ${rowThicknessBorder};">
              <td style="padding: 4px 8px; font-size: 10px; border-right: 1px solid black;">${convertTabsForHtml(row.aminoAcid)}</td>
              <td style="padding: 4px 8px; font-size: 10px; text-align: right;">${convertTabsForHtml(row.amount)}</td>
            </tr>
        `;
      } else {
        html += `
            <tr style="border-bottom: ${rowThicknessBorder};">
              <td colspan="2" style="padding: 4px 8px; font-size: 10px; font-weight: bold; text-align: center; background: black; color: white;">${convertTabsForHtml(row.aminoAcid)}</td>
            </tr>
        `;
      }
    });

    html += `
          </table>
        </div>
      </div>
    </div>
    `;

    return html;
  }, [textSections, nutritionalRows, aminoAcidRows]);

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
        templateType: "protein_powder",
        content: {
          textSections,
          nutritionalRows,
          aminoAcidRows,
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
    textSections,
    nutritionalRows,
    aminoAcidRows,
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
          <h3 className="text-lg font-semibold">Protein Powder NIP</h3>
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
                  Currently editing:{" "}
                  <span className="font-semibold">
                    {product.variants?.find(
                      (v: { _id: string }) => v._id === activeVariantId
                    )?.title || "Unknown Variant"}
                  </span>
                  {product.variants?.find(
                    (v: { _id: string; sku?: string }) =>
                      v._id === activeVariantId
                  )?.sku && (
                    <span className="text-green-600 ml-1">
                      (
                      {
                        product.variants.find(
                          (v: { _id: string; sku?: string }) =>
                            v._id === activeVariantId
                        ).sku
                      }
                      )
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Variant Selection */}
        {product?.variants && product.variants.length > 1 && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
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

        {/* Text Formatting Tools */}
        {selectedTextId && selectedText && (
          <div className="mb-6 p-3 bg-blue-50 rounded border">
            <h4 className="text-sm font-medium mb-2">Format Selected Text</h4>
            <div className="flex space-x-2">
              <button
                onClick={() => applyFormatting(selectedTextId, "bold")}
                className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50 font-bold"
              >
                B
              </button>
              <button
                onClick={() => applyFormatting(selectedTextId, "italic")}
                className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50 italic"
              >
                I
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        {isSaved ? (
          <div className="space-y-4 mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-center">
              <div className="text-green-600 text-lg font-semibold mb-2">
                ✓ NIP Saved Successfully!
              </div>
              <p className="text-green-700 text-sm mb-4">
                Your Protein Powder NIP has been saved for {product?.title}
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
            <div className="flex space-x-2">
              <button
                onClick={() => setIsSaved(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
              >
                Continue Editing
              </button>
              <button
                onClick={() => onSave(null)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium"
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
            onClick={addCustomTextSection}
            className="w-full px-3 py-2 text-sm bg-green-50 hover:bg-green-100 border border-green-200 rounded"
          >
            + Add Custom Text Section
          </button>
          <button
            onClick={addNutritionalRow}
            className="w-full px-3 py-2 text-sm bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded"
          >
            + Add Nutritional Row
          </button>
          <button
            onClick={addAminoAcidRow}
            className="w-full px-3 py-2 text-sm bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded"
          >
            + Add Amino Acid Row
          </button>
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
            onTextSelect={(sectionId, element) => {
              setSelectedTextId(sectionId);
              handleTextSelect(element);
            }}
          />
        </div>

        {/* Right Column: Tables */}
        <div className="flex-1 p-6 bg-white overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">Tables</h3>

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

            <div className="border border-gray-300 rounded overflow-hidden">
              <div className="bg-black text-white text-center py-2 font-semibold text-sm">
                NUTRITIONAL INFORMATION
              </div>

              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left p-2 text-xs font-medium">
                      Nutrient
                    </th>
                    <th className="text-right p-2 text-xs font-medium">
                      Per Serve
                    </th>
                    <th className="text-right p-2 text-xs font-medium">
                      Per 100g
                    </th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {nutritionalRows.map((row) => (
                    <tr key={row.id} className={`${getThicknessBorderStyle(row.thickness || 'normal')} hover:bg-gray-50`}>
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
                          rowThickness={row.thickness || 'normal'}
                          onThicknessChange={(thickness) => updateNutritionalRowThickness(row.id, thickness)}
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
                          rowThickness={row.thickness || 'normal'}
                          onThicknessChange={(thickness) => updateNutritionalRowThickness(row.id, thickness)}
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
                          rowThickness={row.thickness || 'normal'}
                          onThicknessChange={(thickness) => updateNutritionalRowThickness(row.id, thickness)}
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

          {/* Amino Acid Profile Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">Typical Amino Acid Profile</h4>
              <button
                onClick={addAminoAcidRow}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                + Add Row
              </button>
            </div>

            <div className="border border-gray-300 rounded overflow-hidden">
              <div className="bg-black text-white text-center py-2 font-semibold text-sm">
                TYPICAL AMINO ACID PROFILE
              </div>
              <div className="text-center py-1 text-xs border-b">
                Per 100g of Protein
              </div>

              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left p-2 text-xs font-medium">
                      Amino Acid
                    </th>
                    <th className="text-right p-2 text-xs font-medium">
                      Amount
                    </th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {aminoAcidRows.map((row) => (
                    <tr key={row.id} className={`${getThicknessBorderStyle(row.thickness || 'normal')} hover:bg-gray-50`}>
                      <td className="p-2">
                        <FormattableTableInput
                          value={row.aminoAcid}
                          onChange={(value) =>
                            updateAminoAcidRow(row.id, "aminoAcid", value)
                          }
                          className="w-full text-xs bg-transparent border-none outline-none"
                          disabled={
                            product?.variants &&
                            product.variants.length > 1 &&
                            !activeVariantId
                          }
                          rowThickness={row.thickness || 'normal'}
                          onThicknessChange={(thickness) => updateAminoAcidRowThickness(row.id, thickness)}
                        />
                      </td>
                      <td className="p-2">
                        <FormattableTableInput
                          value={row.amount}
                          onChange={(value) =>
                            updateAminoAcidRow(row.id, "amount", value)
                          }
                          className="w-full text-xs bg-transparent border-none outline-none text-right"
                          disabled={
                            product?.variants &&
                            product.variants.length > 1 &&
                            !activeVariantId
                          }
                          rowThickness={row.thickness || 'normal'}
                          onThicknessChange={(thickness) => updateAminoAcidRowThickness(row.id, thickness)}
                        />
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => deleteAminoAcidRow(row.id)}
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
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal
          title="Protein Powder NIP Preview"
          isOpen={showPreview}
          htmlContent={generateHtml()}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
