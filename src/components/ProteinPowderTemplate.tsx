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
  thickness?:
    | "normal"
    | "thick"
    | "medium-thick"
    | "large-thick"
    | "extra-large-thick";
}

interface AminoAcidRow {
  id: string;
  aminoAcid: string;
  amount: string;
  thickness?:
    | "normal"
    | "thick"
    | "medium-thick"
    | "large-thick"
    | "extra-large-thick";
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
  const [variantsList, setVariantsList] = useState<any[]>(product?.variants || []);
  useEffect(() => { setVariantsList(product?.variants || []); }, [product?._id]);
  const createProductVariant = useMutation(api.products.createProductVariant);
  const deleteProductVariant = useMutation(api.products.deleteProductVariant);
  const [addingVariant, setAddingVariant] = useState(false);
  const [newVarTitle, setNewVarTitle] = useState("");
  const [newVarImageUrl, setNewVarImageUrl] = useState("");
  const [savingVar, setSavingVar] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showTextSections, setShowTextSections] = useState(true);

  // Query NIPs for all variants of this product
  const productNips = useQuery(
    api.nips.getNipsByProduct,
    product ? { productId: product._id } : "skip"
  );

  // Get current variant NIP for AU protein powder template (match by variant and template)
  const currentVariantNip = productNips?.find(
    (nip) =>
      nip.variantId === activeVariantId && nip.templateType === "protein_powder"
  );

  // Existence flags for AU (this builder) and US Nutrition Facts
  const auExists = !!productNips?.some(
    (n: any) =>
      n.variantId === activeVariantId && n.templateType === "protein_powder"
  );
  const usExists = !!productNips?.some(
    (n: any) =>
      n.variantId === activeVariantId && n.templateType === "us_nutrition_facts"
  );

  // Initialize default text sections
  const [textSections, setTextSections] = useState<TextSection[]>([
    {
      id: "serving-size-line",
      title: "SERVING SIZE LINE:",
      content: "Serving Size: 30 grams",
      isCustom: false,
    },
    {
      id: "servings-per-pack-line",
      title: "SERVINGS PER PACK LINE:",
      content: "Servings per Pack: 33",
      isCustom: false,
    },
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
        if (typeof content.showTextSections === 'boolean') {
          setShowTextSections(content.showTextSections);
        } else {
          setShowTextSections(true);
        }
        if (content.textSections) {
          let mergedSections: TextSection[] = content.textSections as TextSection[];
          const hasServingSize = mergedSections.some((s) => s.id === "serving-size-line");
          const hasServingsPerPack = mergedSections.some((s) => s.id === "servings-per-pack-line");

          const toAdd: TextSection[] = [];
          if (!hasServingSize) {
            toAdd.push({
              id: "serving-size-line",
              title: "SERVING SIZE LINE:",
              content: "Serving Size: 30 grams",
              isCustom: false,
            });
          }
          if (!hasServingsPerPack) {
            toAdd.push({
              id: "servings-per-pack-line",
              title: "SERVINGS PER PACK LINE:",
              content: "Servings per Pack: 33",
              isCustom: false,
            });
          }
          if (toAdd.length > 0) {
            mergedSections = [...toAdd, ...mergedSections];
          }
          setTextSections(mergedSections);
        }
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

  // Drag and drop state management
  const [draggedNutritionalIndex, setDraggedNutritionalIndex] = useState<
    number | null
  >(null);
  const [draggedAminoAcidIndex, setDraggedAminoAcidIndex] = useState<
    number | null
  >(null);

  // Individual row thickness update functions
  const updateNutritionalRowThickness = useCallback(
    (
      rowId: string,
      thickness:
        | "normal"
        | "thick"
        | "medium-thick"
        | "large-thick"
        | "extra-large-thick"
    ) => {
      setNutritionalRows((prev) =>
        prev.map((row) => (row.id === rowId ? { ...row, thickness } : row))
      );
    },
    []
  );

  const updateAminoAcidRowThickness = useCallback(
    (
      rowId: string,
      thickness:
        | "normal"
        | "thick"
        | "medium-thick"
        | "large-thick"
        | "extra-large-thick"
    ) => {
      setAminoAcidRows((prev) =>
        prev.map((row) => (row.id === rowId ? { ...row, thickness } : row))
      );
    },
    []
  );

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

  // Handle nutritional rows reorder
  const handleNutritionalRowsReorder = useCallback(
    (reorderedRows: NutritionalRow[]) => {
      setNutritionalRows(reorderedRows);
    },
    []
  );

  // Handle amino acid rows reorder
  const handleAminoAcidRowsReorder = useCallback(
    (reorderedRows: AminoAcidRow[]) => {
      setAminoAcidRows(reorderedRows);
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

  // Create drag handlers for amino acid rows
  const aminoAcidDragHandlers = createDragDropHandlers(
    aminoAcidRows,
    handleAminoAcidRowsReorder,
    draggedAminoAcidIndex,
    setDraggedAminoAcidIndex
  );

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
    const servingSizeLine =
      textSections.find((s) => s.id === "serving-size-line")?.content ||
      "Serving Size: 30 grams";
    const servingsPerPackLine =
      textSections.find((s) => s.id === "servings-per-pack-line")?.content ||
      "Servings per Pack: 33";
    let html = `
    <div class="protein-powder-nip" style="font-family: Arial, sans-serif !important; max-width: 90%; margin: 0 auto;">
    `;

    if (showTextSections) {
      html += `
        <!-- Left Column: Text Sections -->
        <div class="left-column" style="flex: 1; padding: 20px; padding-right: 10px;">
      `;
      textSections.forEach((section) => {
        if (
          section.id === "serving-size-line" ||
          section.id === "servings-per-pack-line"
        ) {
          return;
        }
        html += `
          <div class="text-section" style="margin-bottom: 16px;">
            <p style="font-weight: bold; margin: 0 0 4px 0; font-size: 14px;">${convertFormattingForHtml(convertTabsForHtml(section.title))}</p>
            <p style="margin: 0; font-size: 14px; line-height: 1.4;">${convertFormattingForHtml(convertTabsForHtml(section.content))}</p>
          </div>
        `;
      });
      html += `
        </div>
      `;
    }

    html += `
      <!-- Right Column: Tables -->
      <div class="right-column" style="flex: 1; padding: 20px; padding-left: 10px;">
        <!-- Nutritional Information Table -->
        <div class="nutritional-info" style="margin-bottom: 20px; border-radius: 8px; overflow: hidden;">
          <div class="table-header" style="background: black; color: white; text-align: center; font-weight: bold; font-size: 23px !important; letter-spacing: 0.8px !important; padding: 4px 0px; padding-bottom: 0px;">
            NUTRITIONAL INFORMATION
          </div>
          <!-- Serving Information -->
          <div style="padding: 10px; padding-top: 0px; padding-bottom: 0px; border: 2px solid black !important; border-bottom: none !important;">
            <div style="padding: 8px 0px;  border-bottom: 5px solid black !important;">
              <div style="display: flex; justify-content: space-between; font-size: 14px; font-weight: bold;">
                <span style="margin-bottom: 3px;">${convertFormattingForHtml(convertTabsForHtml(servingSizeLine))}</span>
                <span>${convertFormattingForHtml(convertTabsForHtml(servingsPerPackLine))}</span>
              </div>
            </div>
          </div>

          <div style="padding: 10px; padding-top:0px; border: 2px solid black !important; border-top: none !important; margin-bottom:10px; border-radius: 0 0 8px 8px; overflow: hidden;">
          <table style="width: 100%; table-layout: fixed; border-collapse: collapse !important;">
            <colgroup>
              <col style="width: 40%;" />
              <col style="width: 30%;" />
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

      if (index + 1 === nutritionalRows.length) {
        html += `
            <tr style="border-bottom: none !important;">
              <td style="padding: 3px 0px; font-size: 14px; font-weight: 500; border: none !important;">${convertFormattingForHtml(convertTabsForHtml(row.nutrient))}</td>
              <td style="padding: 3px 0px; font-size: 14px; text-align: right; border: none !important;">${convertFormattingForHtml(convertTabsForHtml(row.perServe))}</td>
              <td style="padding: 3px 0px; font-size: 14px; text-align: right; border: none !important;">${convertFormattingForHtml(convertTabsForHtml(row.per100g))}</td>
            </tr>
      `;
      } else {
        html += `
            <tr style="border-bottom: ${rowThicknessBorder} !important;">
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

        
        <!-- Amino Acid Profile Table -->
        <div class="amino-acid-profile" style="border-radius: 8px; overflow: hidden;">
          <div class="table-header" style="background: black; color: white; text-align: center; font-weight: bold; font-size: 21px !important; letter-spacing: 0.8px !important; padding: 8px; padding-bottom: 6px;">
            TYPICAL AMINO ACID PROFILE
          </div>

          <div style="padding: 10px; padding-top:5px; padding-bottom:5px; border: 2px solid black !important; border-bottom:none !important;">
          <div style="text-align: right; font-size: 14px; border-bottom: 5px solid black !important;">
            Per 100g of Protein
          </div>
          </div>

          <div style="padding: 10px; padding-top:0px; border: 2px solid black !important; border-top: none !important; margin-bottom:10px; border-radius: 0 0 8px 8px; overflow: hidden;">
          <table style="width: 100%; table-layout: fixed; border-collapse: collapse; border: none !important;">
            <colgroup>
              <col style="width: 75%;" />
              <col style="width: 25%;" />
            </colgroup>
    `;

    // Add amino acid rows
    aminoAcidRows.forEach((row) => {
      const rowThicknessBorder = getThicknessBorderStyle(
        row.thickness || "normal"
      );

      if (row.amount) {
        html += `
        <tr style="border-bottom: ${rowThicknessBorder} !important;">
              <td style="padding: 3px 0px; font-size: 14px; border: none !important;">${convertFormattingForHtml(convertTabsForHtml(row.aminoAcid))}</td>
                <td style="padding: 3px 0px; font-size: 14px; text-align: right; border: none !important;">${convertFormattingForHtml(convertTabsForHtml(row.amount))}</td>
            </tr>
        `;
      } else {
        html += `
        <tr style="border-bottom: none !important;">
              <td style="padding: 3px 0px; font-size: 14px; border: none !important;">${convertFormattingForHtml(convertTabsForHtml(row.aminoAcid))}</td>
                <td style="padding: 3px 0px; font-size: 14px; text-align: right; border: none !important;">${convertFormattingForHtml(convertTabsForHtml(row.amount))}</td>
            </tr>
        `;
      }
    });

    html += `
          </table>
          </div>
      `;

    const ing = textSections.find((s) => s.id === 'ingredients');
    const ingredientsBlock = !showTextSections && ing
      ? `
        <div class="ingredients" style="margin-top: 16px;">
          <h4 style="font-weight: bold; margin: 0 0 6px 0; font-size: 12px;">${convertFormattingForHtml(convertTabsForHtml(ing.title || 'INGREDIENTS:'))}</h4>
          <p style="margin: 0; font-size: 11px; line-height: 1.4;">${convertFormattingForHtml(convertTabsForHtml(ing.content || ''))}</p>
        </div>
      `
      : '';

    html += `
        ${ingredientsBlock}
      </div>
    </div>
    `;

    return html;
  }, [textSections, nutritionalRows, aminoAcidRows, showTextSections]);

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
          showTextSections,
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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-bold text-gray-900">
              Protein Powder NIP Builder
            </h2>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {product?.title}
              </h3>
              {activeVariantId && (
                <p className="text-sm text-gray-600">
                  Variant:{" "}
                  {product?.variants?.find(
                    (v: any) => v._id === activeVariantId
                  )?.title || "Unknown"}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowPreview(true)}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
            >
              Preview
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              Update NIP
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Success Message */}
        {isSaved && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-green-600 text-sm font-semibold mb-2">
              ✓ NIP Saved Successfully!
            </div>
            <p className="text-green-700 text-xs">
              Your Protein Powder NIP has been saved for {product?.title}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* Variant Selection */}
          {variantsList && variantsList.length > 0 && (
            <div className="flex-1">
              <div className="flex items-center gap-x-2">
                <label className="text-sm font-medium text-gray-700">
                  Select Variant:
                </label>
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => setAddingVariant((v) => !v)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {addingVariant ? "Cancel" : "+ Add Variant"}
                  </button>

                  {activeVariantId && (
                    <div className="flex">
                      &nbsp;|&nbsp;
                      <button
                        type="button"
                        className="text-xs text-red-600 hover:text-red-800"
                        onClick={async () => {
                          const v = variantsList.find(
                            (vv: any) =>
                              String(vv._id) === String(activeVariantId)
                          );
                          const ok = confirm(
                            `Delete variant "${v?.title || "Selected"}"? This will also remove its NIPs.`
                          );
                          if (!ok) return;
                          try {
                            await deleteProductVariant({
                              variantId: activeVariantId as any,
                            });
                            setVariantsList((l: any[]) =>
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
                onChange={(e) => setActiveVariantId(e.target.value)}
                className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-64"
              >
                {variantsList.map(
                  (v: { _id: string; title?: string; sku?: string }) => (
                    <option key={v._id} value={v._id}>
                      {v.title || "Unnamed Variant"} {v.sku ? `- ${v.sku}` : ""}
                    </option>
                  )
                )}
              </select>
              {addingVariant && (
                <div className="mt-2 grid grid-cols-1 md:grid-cols-5 gap-2 w-full md:w-auto">
                  <input
                    className="md:col-span-2 w-full rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 px-3 py-2"
                    placeholder="Variant title"
                    value={newVarTitle}
                    onChange={(e) => setNewVarTitle(e.target.value)}
                  />
                  <input
                    className="md:col-span-2 w-full rounded-md border border-gray-300 focus:ring-2 focus:ring-blue-500 px-3 py-2"
                    placeholder="Image URL (optional)"
                    value={newVarImageUrl}
                    onChange={(e) => setNewVarImageUrl(e.target.value)}
                  />
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
                          const id = await createProductVariant({
                            productId: product._id,
                            title,
                            imageUrl: newVarImageUrl.trim(),
                          } as any);
                          setVariantsList((l) => [
                            ...l,
                            { _id: id, title, imageUrl: newVarImageUrl.trim() },
                          ]);
                          setActiveVariantId(String(id));
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

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">
              Quick Actions:
            </span>
            <button
              onClick={addCustomTextSection}
              className="px-3 py-1 text-xs bg-green-50 hover:bg-green-100 border border-green-200 rounded"
            >
              + Add Text Section
            </button>
            <button
              onClick={addNutritionalRow}
              className="px-3 py-1 text-xs bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded"
            >
              + Add Nutritional Row
            </button>
            <button
              onClick={addAminoAcidRow}
              className="px-3 py-1 text-xs bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded"
            >
              + Add Ingredient
            </button>
            {selectedTextId && selectedText && (
              <>
                <button
                  onClick={() => applyFormatting(selectedTextId, "bold")}
                  className="px-3 py-1 text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded font-bold"
                >
                  B
                </button>
                <button
                  onClick={() => applyFormatting(selectedTextId, "italic")}
                  className="px-3 py-1 text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded italic"
                >
                  I
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Text Sections */}
        <div className="flex-1 p-6 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold mb-4">Text Sections</h3>
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
            onTextSelect={(sectionId, element) => {
              setSelectedTextId(sectionId);
              handleTextSelect(element as HTMLTextAreaElement);
            }}
          />
        </div>

        {/* Right Column: Tables */}
        <div className="flex-1 p-6 bg-white overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Tables</h3>
          </div>

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
              <div className="bg-black text-white text-center font-bold text-2xl px-2 pt-2 pb-2 tracking-[0.5em] w-full">
                NUTRITIONAL INFORMATION
              </div>
              {/* Serving Information (values come from Text Sections) */}
              <div className="px-3 py-3 bg-white">
                <div className="flex justify-between text-xs font-bold">
                  <span>
                    {textSections.find((s) => s.id === "serving-size-line")
                      ?.content || "Serving Size: 30 grams"}
                  </span>
                  <span>
                    {textSections.find((s) => s.id === "servings-per-pack-line")
                      ?.content || "Servings per Pack: 33"}
                  </span>
                </div>
              </div>

              <div className="p-2">
                <table className="w-full table-fixed border-collapse">
                  <colgroup>
                    <col className="w-1/2" />
                    <col className="w-1/4" />
                    <col className="w-1/4" />
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-2 py-1 text-xs font-medium"></th>
                      <th className="text-left px-2 py-1 text-xs font-medium">
                        Per Serve
                      </th>
                      <th className="text-left px-2 py-1 text-xs font-medium">
                        Per 100g
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {nutritionalRows.map((row, index) => {
                      if (row.id === "serving-info") return null; // Skip serving info row as it's displayed separately

                      return (
                        <React.Fragment key={row.id}>
                          <tr
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
                            <td className="px-0 py-2  ">
                              <FormattableTableInput
                                value={row.nutrient}
                                onChange={(value) =>
                                  updateNutritionalRow(
                                    row.id,
                                    "nutrient",
                                    value
                                  )
                                }
                                className="w-full text-sm bg-transparent border-none outline-none font-medium"
                                disabled={
                                  product?.variants &&
                                  product.variants.length > 1 &&
                                  !activeVariantId
                                }
                                rowThickness={row.thickness || "normal"}
                                onThicknessChange={(thickness) =>
                                  updateNutritionalRowThickness(
                                    row.id,
                                    thickness
                                  )
                                }
                              />
                            </td>
                            <td className="px-0 py-0">
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
                                onThicknessChange={(thickness) =>
                                  updateNutritionalRowThickness(
                                    row.id,
                                    thickness
                                  )
                                }
                              />
                            </td>
                            <td className="px-0 py-0 relative">
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
                                  onThicknessChange={(thickness) =>
                                    updateNutritionalRowThickness(
                                      row.id,
                                      thickness
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
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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

            <div className="border-2 border-black rounded-lg overflow-hidden">
              <div className="bg-black text-white text-center font-bold text-2xl py-0 tracking-[0.5em] w-full">
                TYPICAL AMINO ACID PROFILE
              </div>
              <div className="text-right px-3 py-3 text-sm border-b-2 z border-black">
                Per 100g of Protein
              </div>

              <div className="p-2">
                <table className="w-full table-fixed border-b-2 border-black">
                  <colgroup>
                    <col className="w-2/3" />
                    <col className="w-1/3" />
                  </colgroup>
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-2 py-1 text-xs font-medium">
                        Amino Acid
                      </th>
                      <th className="text-right px-2 py-1 text-xs font-medium">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {aminoAcidRows.map((row, index) => (
                      <tr
                        key={row.id}
                        onDragStart={(e) =>
                          aminoAcidDragHandlers.onDragStart(e, index)
                        }
                        onDragOver={aminoAcidDragHandlers.onDragOver}
                        onDrop={(e) => aminoAcidDragHandlers.onDrop(e, index)}
                        onDragEnd={aminoAcidDragHandlers.onDragEnd}
                        className={`${getBorderClass(row.thickness || "normal")} hover:bg-gray-50 ${
                          draggedAminoAcidIndex === index ? "opacity-50" : ""
                        }`}
                        style={
                          draggedAminoAcidIndex === index
                            ? getDragHandleStyles()
                            : {}
                        }
                      >
                        <td className="px-0 py-2">
                          <FormattableTableInput
                            value={row.aminoAcid}
                            onChange={(value) =>
                              updateAminoAcidRow(row.id, "aminoAcid", value)
                            }
                            className="w-full text-sm bg-transparent border-none outline-none"
                            disabled={
                              product?.variants &&
                              product.variants.length > 1 &&
                              !activeVariantId
                            }
                            rowThickness={row.thickness || "normal"}
                            onThicknessChange={(thickness) =>
                              updateAminoAcidRowThickness(row.id, thickness)
                            }
                          />
                        </td>
                        <td className="px-0 py-0 relative">
                          <div className="flex items-center">
                            <FormattableTableInput
                              value={row.amount}
                              onChange={(value) =>
                                updateAminoAcidRow(row.id, "amount", value)
                              }
                              className="flex-1 text-sm bg-transparent border-none outline-none text-right pr-12"
                              disabled={
                                product?.variants &&
                                product.variants.length > 1 &&
                                !activeVariantId
                              }
                              rowThickness={row.thickness || "normal"}
                              onThicknessChange={(thickness) =>
                                updateAminoAcidRowThickness(row.id, thickness)
                              }
                            />
                            {/* Drag handle button for row reordering */}
                            <button
                              aria-label="Drag to reorder"
                              title="Drag to reorder"
                              draggable
                              onDragStart={(e) =>
                                aminoAcidDragHandlers.onDragStart(e, index)
                              }
                              onDragEnd={aminoAcidDragHandlers.onDragEnd}
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
                              onClick={() => deleteAminoAcidRow(row.id)}
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
          title="Protein Powder NIP"
          isOpen={showPreview}
          productId={product._id}
          region="AU"
          variants={product.variants}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
