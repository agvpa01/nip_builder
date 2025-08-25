import React from "react";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  title: string;
}

export function PreviewModal({
  isOpen,
  onClose,
  htmlContent,
  title,
}: PreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl max-h-[90vh] w-full mx-4 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Preview: {title}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => {
                const printWindow = window.open("", "_blank");
                if (printWindow) {
                  printWindow.document.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>${title} - NIP Preview</title>
                      <style>
                        body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                        @media print {
                          body { margin: 0; padding: 10px; }
                        }
                      </style>
                    </head>
                    <body>
                      ${htmlContent}
                    </body>
                    </html>
                  `);
                  printWindow.document.close();
                  printWindow.print();
                }
              }}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Print
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(htmlContent);
                // You could add a toast notification here
              }}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Copy HTML
            </button>
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
          <div className="bg-gray-50 border border-gray-200 rounded p-4 mb-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Rendered Preview:
            </h3>
            <div
              className="bg-white border rounded p-4 min-h-[400px]"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              HTML Source:
            </h3>
            <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-auto max-h-60">
              <code>{htmlContent}</code>
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200">
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
