import React, { useState, useCallback, useRef, useEffect } from "react";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { PreviewModal } from "./PreviewModal";
import { Id } from "../../convex/_generated/dataModel";

interface NipBuilderProps {
  product: any;
  variant?: any;
  currentNip: any;
  onSave: (nip: any) => void;
  onCancel: () => void;
}

interface Section {
  id: string;
  type: "text" | "table" | "image" | "custom";
  content: any;
  position: { x: number; y: number };
  styling: {
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
    lineThickness?: number;
    color?: string;
  };
}

interface CustomField {
  id: string;
  label: string;
  value: string;
  type: string;
}

export function NipBuilder({
  product,
  variant,
  currentNip,
  onSave,
  onCancel,
}: NipBuilderProps) {
  const [activeVariantId, setActiveVariantId] = useState<string | null>(
    variant?._id || null
  );
  const [isFirstVariantAutoSelected, setIsFirstVariantAutoSelected] = useState(false);
  const [sections, setSections] = useState<Section[]>(
    currentNip?.content?.sections || []
  );
  const [isSaved, setIsSaved] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>(
    currentNip?.content?.customFields || []
  );
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showPreview, setShowPreview] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const createNip = useAction(api.nips.createNipWithTabbedFile as any);
  const updateNip = useAction(api.nips.updateNipWithTabbedFile as any);

  // Get all NIPs for this product to support variant tabs
  const productNips = useQuery(api.nips.getNipsByProduct, {
    productId: product._id,
  });

  // Get current variant or default to first variant
  const currentVariant = activeVariantId
    ? product.variants?.find((v: any) => v._id === activeVariantId)
    : product.variants?.[0];

  // Get NIP for current variant
  const currentVariantNip =
    productNips?.find((nip) => nip.variantId === activeVariantId) || currentNip;

  // Auto-select first variant when product loads with variants
  useEffect(() => {
    if (product?.variants && product.variants.length > 0 && !activeVariantId && !variant) {
      const firstVariant = product.variants[0];
      setActiveVariantId(firstVariant._id);
      setIsFirstVariantAutoSelected(true);
      
      // Load existing NIP data for the first variant if it exists
      const firstVariantNip = productNips?.find(
        (nip) => nip.variantId === firstVariant._id
      );
      if (firstVariantNip) {
        setSections((firstVariantNip.content?.sections || []) as Section[]);
        setCustomFields(firstVariantNip.content?.customFields || []);
      }
    }
  }, [product, activeVariantId, variant, productNips]);

  // Add new section
  const addSection = useCallback(
    (type: Section["type"]) => {
      const newSection: Section = {
        id: `section-${Date.now()}`,
        type,
        content: getDefaultContent(type),
        position: { x: 50, y: 50 + sections.length * 100 },
        styling: {
          fontSize: 14,
          fontWeight: "normal",
          fontStyle: "normal",
          lineThickness: 1,
          color: "#000000",
        },
      };
      setSections((prev) => [...prev, newSection]);
    },
    [sections.length]
  );

  // Get default content based on section type
  function getDefaultContent(type: Section["type"]) {
    switch (type) {
      case "text":
        return "Enter your text here...";
      case "table":
        return {
          headers: ["Nutrient", "Amount", "Daily Value"],
          rows: [
            ["Protein", "25g", "50%"],
            ["Carbs", "5g", "2%"],
          ],
        };
      case "image":
        return { url: "", alt: "Image description" };
      case "custom":
        return "Custom content";
      default:
        return "";
    }
  }

  // Update section content
  const updateSection = useCallback(
    (sectionId: string, updates: Partial<Section>) => {
      setSections((prev) =>
        prev.map((section) =>
          section.id === sectionId ? { ...section, ...updates } : section
        )
      );
    },
    []
  );

  // Delete section
  const deleteSection = useCallback((sectionId: string) => {
    setSections((prev) => prev.filter((section) => section.id !== sectionId));
    setSelectedSection(null);
  }, []);

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.MouseEvent, sectionId: string) => {
      const section = sections.find((s) => s.id === sectionId);
      if (!section) return;

      setIsDragging(true);
      setSelectedSection(sectionId);
      setDragOffset({
        x: e.clientX - section.position.x,
        y: e.clientY - section.position.y,
      });
    },
    [sections]
  );

  // Handle drag move
  const handleDragMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !selectedSection || !canvasRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const newX = e.clientX - rect.left - dragOffset.x;
      const newY = e.clientY - rect.top - dragOffset.y;

      updateSection(selectedSection, {
        position: { x: Math.max(0, newX), y: Math.max(0, newY) },
      });
    },
    [isDragging, selectedSection, dragOffset, updateSection]
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
  }, []);

  // Add custom field
  const addCustomField = useCallback(() => {
    const newField: CustomField = {
      id: `field-${Date.now()}`,
      label: "New Field",
      value: "",
      type: "text",
    };
    setCustomFields((prev) => [...prev, newField]);
  }, []);

  // Update custom field
  const updateCustomField = useCallback(
    (fieldId: string, updates: Partial<CustomField>) => {
      setCustomFields((prev) =>
        prev.map((field) =>
          field.id === fieldId ? { ...field, ...updates } : field
        )
      );
    },
    []
  );

  // Delete custom field
  const deleteCustomField = useCallback((fieldId: string) => {
    setCustomFields((prev) => prev.filter((field) => field.id !== fieldId));
  }, []);

  // Handle variant tab change
  const handleVariantChange = useCallback(
    (variantId: string) => {
      setActiveVariantId(variantId);
      const variantNip = productNips?.find(
        (nip) => nip.variantId === variantId
      );
      if (variantNip) {
        setSections((variantNip.content?.sections || []) as Section[]);
        setCustomFields(variantNip.content?.customFields || []);
      } else {
        // Reset to empty state for new variant
        setSections([]);
        setCustomFields([]);
      }
      setSelectedSection(null);
    },
    [productNips]
  );

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
        templateType:
          currentVariantNip?.templateType || currentNip.templateType,
        content: { sections, customFields },
        htmlContent: generateHTML(),
      };

      if (currentVariantNip?._id) {
        const result = await updateNip({
          nipId: currentVariantNip._id,
          productId: nipData.productId,
          variantId: activeVariantId
            ? (activeVariantId as Id<"productVariants">)
            : undefined,
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
      } else {
        const result = await createNip({
          productId: product._id as Id<"products">,
          variantId: activeVariantId as Id<"productVariants"> | undefined,
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
    currentNip,
    sections,
    customFields,
    generateHTML,
    createNip,
    updateNip,
    onSave,
  ]);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Toolbar */}
      <div className="w-64 bg-white border-r border-gray-200 p-4">
        <h3 className="text-lg font-semibold mb-4">Tools</h3>

        {/* Add Sections */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Add Sections
          </h4>
          <div className="space-y-2">
            <button
              onClick={() => addSection("text")}
              className="w-full px-3 py-2 text-left text-sm bg-blue-50 hover:bg-blue-100 rounded border"
            >
              📝 Text
            </button>
            <button
              onClick={() => addSection("table")}
              className="w-full px-3 py-2 text-left text-sm bg-green-50 hover:bg-green-100 rounded border"
            >
              📊 Table
            </button>
            <button
              onClick={() => addSection("image")}
              className="w-full px-3 py-2 text-left text-sm bg-purple-50 hover:bg-purple-100 rounded border"
            >
              🖼️ Image
            </button>
            <button
              onClick={() => addSection("custom")}
              className="w-full px-3 py-2 text-left text-sm bg-orange-50 hover:bg-orange-100 rounded border"
            >
              ⚙️ Custom
            </button>
          </div>
        </div>

        {/* Custom Fields */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Custom Fields</h4>
            <button
              onClick={addCustomField}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add
            </button>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {customFields.map((field) => (
              <div key={field.id} className="p-2 bg-gray-50 rounded border">
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) =>
                    updateCustomField(field.id, { label: e.target.value })
                  }
                  className="w-full text-xs mb-1 px-2 py-1 border rounded"
                  placeholder="Field label"
                />
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) =>
                    updateCustomField(field.id, { value: e.target.value })
                  }
                  className="w-full text-xs mb-1 px-2 py-1 border rounded"
                  placeholder="Field value"
                />
                <button
                  onClick={() => deleteCustomField(field.id)}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        {isSaved ? (
          <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-center">
              <div className="text-green-600 text-lg font-semibold mb-2">
                ✓ NIP Saved Successfully!
              </div>
              <p className="text-green-700 text-sm mb-4">
                Your NIP has been saved for {product?.title}
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
            <button
              onClick={() => onSave(null)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
            >
              Back to NIPs
            </button>
          </div>
        ) : (
          <div className="space-y-2">
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
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b border-gray-200 p-4">
          <h2 className="text-xl font-semibold">{product.title}</h2>
          <p className="text-sm text-gray-600 mb-3">
            Template:{" "}
            {(currentVariantNip?.templateType || currentNip.templateType)
              .replace("_", " ")
              .replace(/\b\w/g, (l: string) => l.toUpperCase())}
          </p>

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
                      )?.title ||
                        product.variants?.find(
                          (v: { _id: string }) => v._id === activeVariantId
                        )?.title ||
                        "Unknown Variant"}
                    </span>
                    {product.variants?.find(
                      (v: { _id: string }) => v._id === activeVariantId
                    )?.sku && (
                      <span className="text-green-600 ml-1">
                        (
                        {
                          product.variants.find(
                            (v: { _id: string }) => v._id === activeVariantId
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

          {/* Variant Tabs */}
          {product.variants && product.variants.length > 1 && (
            <div className="flex space-x-1 border-b border-gray-200">
              {product.variants.map((v: any) => {
                const hasNip = productNips?.some(
                  (nip) => nip.variantId === v._id
                );
                return (
                  <button
                    key={v._id}
                    onClick={() => {
                      handleVariantChange(v._id);
                      setIsFirstVariantAutoSelected(false); // Clear auto-selection indicator when user manually selects
                    }}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                      activeVariantId === v._id
                        ? "border-blue-500 text-blue-600 bg-blue-50"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    {v.name || v.title || "Unnamed Variant"}
                    {hasNip && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓
                      </span>
                    )}
                    {activeVariantId === v._id && isFirstVariantAutoSelected && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        Auto-selected
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div
          ref={canvasRef}
          className="flex-1 relative bg-white m-4 border border-gray-300 rounded overflow-hidden"
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          {sections.map((section) => (
            <div
              key={section.id}
              className={`absolute border-2 p-2 bg-white cursor-move ${
                selectedSection === section.id
                  ? "border-blue-500"
                  : "border-gray-300"
              } hover:border-blue-400`}
              style={{
                left: section.position.x,
                top: section.position.y,
                fontSize: section.styling.fontSize,
                fontWeight: section.styling.fontWeight,
                fontStyle: section.styling.fontStyle,
                color: section.styling.color,
              }}
              onMouseDown={(e) => handleDragStart(e, section.id)}
              onClick={() => setSelectedSection(section.id)}
            >
              {section.type === "text" && (
                <textarea
                  value={section.content}
                  onChange={(e) =>
                    updateSection(section.id, { content: e.target.value })
                  }
                  className="w-full min-w-48 bg-transparent border-none outline-none resize-none"
                  rows={3}
                />
              )}

              {section.type === "table" && (
                <div className="min-w-64">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        {section.content.headers.map(
                          (header: string, i: number) => (
                            <th
                              key={i}
                              className="border border-gray-300 p-1 bg-gray-50"
                            >
                              <input
                                type="text"
                                value={header}
                                onChange={(e) => {
                                  const newHeaders = [
                                    ...section.content.headers,
                                  ];
                                  newHeaders[i] = e.target.value;
                                  updateSection(section.id, {
                                    content: {
                                      ...section.content,
                                      headers: newHeaders,
                                    },
                                  });
                                }}
                                className="w-full bg-transparent text-xs"
                              />
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {section.content.rows.map(
                        (row: string[], rowIndex: number) => (
                          <tr key={rowIndex}>
                            {row.map((cell: string, cellIndex: number) => (
                              <td
                                key={cellIndex}
                                className="border border-gray-300 p-1"
                              >
                                <input
                                  type="text"
                                  value={cell}
                                  onChange={(e) => {
                                    const newRows = [...section.content.rows];
                                    newRows[rowIndex][cellIndex] =
                                      e.target.value;
                                    updateSection(section.id, {
                                      content: {
                                        ...section.content,
                                        rows: newRows,
                                      },
                                    });
                                  }}
                                  className="w-full bg-transparent text-xs"
                                />
                              </td>
                            ))}
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {section.type === "image" && (
                <div className="min-w-48">
                  <input
                    type="text"
                    value={section.content.url}
                    onChange={(e) =>
                      updateSection(section.id, {
                        content: { ...section.content, url: e.target.value },
                      })
                    }
                    placeholder="Image URL"
                    className="w-full mb-2 px-2 py-1 text-xs border rounded"
                  />
                  {section.content.url && (
                    <img
                      src={section.content.url}
                      alt={section.content.alt}
                      className="max-w-48 h-auto"
                    />
                  )}
                </div>
              )}

              {section.type === "custom" && (
                <textarea
                  value={section.content}
                  onChange={(e) =>
                    updateSection(section.id, { content: e.target.value })
                  }
                  className="w-full min-w-48 bg-transparent border-none outline-none resize-none"
                  rows={2}
                  placeholder="Custom content..."
                />
              )}

              {/* Section Controls */}
              {selectedSection === section.id && (
                <div className="absolute -top-8 left-0 flex space-x-1 bg-white border rounded shadow-sm p-1">
                  <button
                    onClick={() =>
                      updateSection(section.id, {
                        styling: {
                          ...section.styling,
                          fontWeight:
                            section.styling.fontWeight === "bold"
                              ? "normal"
                              : "bold",
                        },
                      })
                    }
                    className={`px-2 py-1 text-xs rounded ${
                      section.styling.fontWeight === "bold"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100"
                    }`}
                  >
                    B
                  </button>
                  <button
                    onClick={() =>
                      updateSection(section.id, {
                        styling: {
                          ...section.styling,
                          fontStyle:
                            section.styling.fontStyle === "italic"
                              ? "normal"
                              : "italic",
                        },
                      })
                    }
                    className={`px-2 py-1 text-xs rounded italic ${
                      section.styling.fontStyle === "italic"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100"
                    }`}
                  >
                    I
                  </button>
                  <input
                    type="range"
                    min="8"
                    max="24"
                    value={section.styling.fontSize}
                    onChange={(e) =>
                      updateSection(section.id, {
                        styling: {
                          ...section.styling,
                          fontSize: parseInt(e.target.value),
                        },
                      })
                    }
                    className="w-16"
                  />
                  <button
                    onClick={() => deleteSection(section.id)}
                    className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))}

          {sections.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <p>Add sections from the toolbar to start building your NIP</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal
          title="NIP Preview"
          isOpen={showPreview}
          htmlContent={generateHTML()}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );

  // Generate HTML for preview
  function generateHTML(): string {
    let html = `
      <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1 style="text-align: center; margin-bottom: 30px;">${product.title}</h1>
    `;

    sections.forEach((section) => {
      const style = `
        position: absolute;
        left: ${section.position.x}px;
        top: ${section.position.y}px;
        font-size: ${section.styling.fontSize || 14}px;
        font-weight: ${section.styling.fontWeight || "normal"};
        font-style: ${section.styling.fontStyle || "normal"};
        color: ${section.styling.color || "#000000"};
      `;

      switch (section.type) {
        case "text":
          html += `<div style="${style}">${section.content}</div>`;
          break;
        case "table":
          if (section.content.rows) {
            html += `<table style="${style} border-collapse: collapse;">`;
            section.content.rows.forEach((row: any) => {
              html += "<tr>";
              row.forEach((cell: string) => {
                html += `<td style="border: 1px solid #ccc; padding: 8px;">${cell}</td>`;
              });
              html += "</tr>";
            });
            html += "</table>";
          }
          break;
        case "custom":
          html += `<div style="${style}">${section.content}</div>`;
          break;
      }
    });

    customFields.forEach((field) => {
      html += `<div style="margin: 10px 0;"><strong>${field.label}:</strong> ${field.value}</div>`;
    });

    html += "</div>";
    return html;
  }
}
