import { auth } from "./auth";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

auth.addHttpRoutes(http);

// Serve HTML files by filename
http.route({
  path: "/nip/:filename",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const filename = pathParts[pathParts.length - 1];

    if (!filename || !filename.endsWith(".html")) {
      return new Response("Invalid filename", { status: 400 });
    }

    try {
      // Find NIP by searching for the filename pattern
      const nips = await ctx.runQuery(api.nips.getAllNips);

      let targetNip = null;
      let targetProduct = null;

      // Search through NIPs to find matching filename
      for (const nip of nips) {
        if (nip.htmlFileId) {
          const products = await ctx.runQuery(api.products.getAllProducts);
          const foundProduct = products.find((p) => p._id === nip.productId);
          if (foundProduct) {
            const expectedFilename = generateFilenameFromUrl(
              foundProduct.onlineStoreUrl,
              nip.variantId
            );
            if (expectedFilename === filename) {
              targetNip = nip;
              targetProduct = foundProduct;
              break;
            }
          }
        }
      }

      if (!targetNip || !targetNip.htmlFileId) {
        return new Response("NIP not found", { status: 404 });
      }

      // Get the file from storage
      const fileUrl = await ctx.storage.getUrl(
        targetNip.htmlFileId as Id<"_storage">
      );

      if (!fileUrl) {
        return new Response("File not found in storage", { status: 404 });
      }

      // Fetch the file content
      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        return new Response("Failed to fetch file", { status: 500 });
      }

      const htmlContent = await fileResponse.text();

      return new Response(htmlContent, {
        status: 200,
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        },
      });
    } catch (error) {
      console.error("Error serving NIP:", error);
      return new Response("Internal server error", { status: 500 });
    }
  }),
});

// Helper function to generate filename (same as in nips.ts)
function generateFilenameFromUrl(
  onlineStoreUrl: string,
  variantId?: string
): string {
  // Extract the product handle from the URL
  const urlParts = onlineStoreUrl.split("/");
  const productHandle = urlParts[urlParts.length - 1] || "product";

  // Clean the handle to be filesystem-safe
  const cleanHandle = productHandle.replace(/[^a-zA-Z0-9-_]/g, "-");

  // Add variant suffix if provided
  const filename = variantId ? `${cleanHandle}-${variantId}` : cleanHandle;

  return `${filename}.html`;
}

export default http;
