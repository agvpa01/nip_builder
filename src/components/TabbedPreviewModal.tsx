import React from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface TabbedPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: Id<"products">;
  title: string;
  templateType?: string;
}

export function TabbedPreviewModal({
  isOpen,
  onClose,
  productId,
  title,
  templateType,
}: TabbedPreviewModalProps) {
  const tabbedNipData = useQuery(
    api.nips.generateTabbedProductHtml,
    isOpen ? { productId, templateType } : "skip"
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Tabbed NIP Preview: {title}
          </h2>
          <div className="flex space-x-2">
            {tabbedNipData?.success && (
              <>
                <button
                  onClick={() => {
                    const newWindow = window.open("", "_blank");
                    if (newWindow) {
                      newWindow.document.write(tabbedNipData.html);
                      newWindow.document.close();
                    }
                  }}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Open in New Tab
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(tabbedNipData.html);
                    // You could add a toast notification here
                  }}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Copy HTML
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {tabbedNipData?.success ? (
            <div className="bg-gray-50 border border-gray-200 rounded p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-700">
                  Interactive Tabbed NIP Preview:
                </h3>
                <span className="text-xs text-gray-500">
                  {tabbedNipData.variantCount} variant(s)
                </span>
              </div>
              <div
                className="bg-white border rounded min-h-[500px] w-full"
                style={{ height: '60vh' }}
              >
                <iframe
                  srcDoc={tabbedNipData.html}
                  className="w-full h-full border-0 rounded"
                  title={`Tabbed NIP - ${title}`}
                />
              </div>
            </div>
          ) : tabbedNipData?.success === false ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{tabbedNipData.message}</p>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">
                Generating tabbed NIP preview...
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {tabbedNipData?.success && (
              <span>
                Interactive tabbed view with {tabbedNipData.variantCount}{" "}
                variant(s)
              </span>
            )}
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
