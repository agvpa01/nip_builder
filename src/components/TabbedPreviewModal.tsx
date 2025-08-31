import React, { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface TabbedPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: Id<"products">;
  title: string;
  templateType?: string;
  region?: "AU" | "US" | string;
  variants?: Array<{ _id: Id<"productVariants">; title: string }>;
}

export function TabbedPreviewModal({
  isOpen,
  onClose,
  productId,
  title,
  templateType,
  region,
  variants,
}: TabbedPreviewModalProps) {
  const nips = useQuery(
    api.nips.getNipsByProduct,
    isOpen ? { productId } : "skip"
  ) as any[] | undefined;

  const { items, defaultKey } = useMemo(() => {
    const filtered = (nips || []).filter((n: any) => {
      if (templateType) return n.templateType === templateType;
      if (region) return n.region === region;
      return true;
    });

    // Group by variant and pick latest with non-empty html
    const byVariant = new Map<string, any[]>();
    for (const nip of filtered) {
      const key = nip.variantId ? String(nip.variantId) : "no-variant";
      const arr = byVariant.get(key) || [];
      arr.push(nip);
      byVariant.set(key, arr);
    }

    const items: Array<{ key: string; title: string; html: string; templateType: string }> = [];
    for (const [key, arr] of byVariant.entries()) {
      const latest = arr
        .filter((n) => typeof n.htmlContent === "string" && n.htmlContent.trim() !== "")
        .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))[0];
      if (!latest) continue;
      const title = latest.variantId
        ? (variants?.find((v) => String(v._id) === String(latest.variantId))?.title || "Variant")
        : "Default";
      items.push({ key, title, html: latest.htmlContent, templateType: latest.templateType });
    }
    return { items, defaultKey: items[0]?.key };
  }, [nips, templateType, region, variants]);

  const [activeKey, setActiveKey] = useState<string | undefined>(undefined);
  const currentKey = activeKey ?? defaultKey;
  const activeItem = useMemo(() => items.find((i) => i.key === currentKey), [items, currentKey]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">NIP Preview: {title}</h2>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {!nips ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading NIP preview...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">No NIPs found for this selection.</p>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700">Preview</h3>
                <span className="text-xs text-gray-500">{items.length} variant(s)</span>
              </div>
              {items.length > 1 && (
                <div className="flex flex-wrap border-b mb-3">
                  {items.map((it) => (
                    <button
                      key={it.key}
                      onClick={() => setActiveKey(it.key)}
                      className={`px-3 py-2 text-sm mr-2 mb-2 border-b-2 ${
                        currentKey === it.key
                          ? "border-blue-600 text-blue-700 bg-white"
                          : "border-transparent text-gray-600 bg-gray-100 hover:bg-gray-200"
                      } rounded-t`}
                    >
                      {it.title}
                    </button>
                  ))}
                </div>
              )}
              <div className="bg-white border rounded min-h-[400px] p-4">
                {activeItem ? (
                  <div dangerouslySetInnerHTML={{ __html: activeItem.html }} />
                ) : (
                  <div className="text-gray-500 text-sm">Select a variant to preview.</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {items.length > 0 && <span>Showing {items.length} variant(s)</span>}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
