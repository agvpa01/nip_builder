import { v } from "convex/values";
import { query, mutation, action, internalMutation } from "./_generated/server";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Check if a NIP exists for a product (and optionally a variant)
export const checkNipExists = query({
  args: {
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
  },
  handler: async (ctx, { productId, variantId }) => {
    let nip;

    if (variantId) {
      // If variantId is provided, look for exact match
      nip = await ctx.db
        .query("nips")
        .withIndex("by_product_variant", (q) =>
          q.eq("productId", productId).eq("variantId", variantId)
        )
        .first();
    } else {
      // If no variantId provided, find any NIP for this product
      nip = await ctx.db
        .query("nips")
        .withIndex("by_product", (q) => q.eq("productId", productId))
        .first();
    }

    return {
      exists: !!nip,
      nip: nip || null,
    };
  },
});

// Get all NIPs for a product (including all variants)
export const getNipsByProduct = query({
  args: {
    productId: v.id("products"),
  },
  returns: v.array(v.any()),
  handler: async (ctx, { productId }) => {
    const nips = await ctx.db
      .query("nips")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();

    return nips;
  },
});

// Get all NIPs (for HTTP endpoint)
export const getAllNips = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const nips = await ctx.db.query("nips").collect();
    return nips;
  },
});

// Get public URL for a NIP
export const getNipPublicUrl = query({
  args: {
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { productId, variantId }) => {
    // Find the NIP record for this product and variant
    let nips;
    if (variantId) {
      // Use the compound index when variantId is provided
      nips = await ctx.db
        .query("nips")
        .withIndex("by_product_variant", (q) =>
          q.eq("productId", productId).eq("variantId", variantId)
        )
        .first();
    } else {
      // Use the product index and filter for null variantId
      nips = await ctx.db
        .query("nips")
        .withIndex("by_product", (q) => q.eq("productId", productId))
        .filter((q) => q.eq(q.field("variantId"), undefined))
        .first();
    }

    if (!nips || !nips.htmlFileId) {
      return null;
    }

    // Get the file URL from storage
    const fileUrl = await ctx.storage.getUrl(nips.htmlFileId);
    return fileUrl;
  },
});

// Get public URL for a specific NIP by its ID
export const getNipPublicUrlById = query({
  args: { nipId: v.id("nips") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { nipId }) => {
    const nip = await ctx.db.get(nipId);
    if (!nip || !nip.htmlFileId) return null;
    const url = await ctx.storage.getUrl(nip.htmlFileId);
    return url;
  },
});

// Get public URL for the latest tabbed HTML for a product (optionally per templateType)
export const getTabbedNipPublicUrl = query({
  args: {
    productId: v.id("products"),
    templateType: v.optional(v.string()),
  },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { productId, templateType }) => {
    let nips = await ctx.db
      .query("nips")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();

    if (templateType) {
      nips = nips.filter((n: any) => n.templateType === templateType);
    }

    // Get the most recent record that has a tabbedHtmlFileId
    const withTabbed = nips
      .filter((n: any) => n.tabbedHtmlFileId)
      .sort(
        (a: any, b: any) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)
      )[0];

    if (!withTabbed) return null;

    const url = await ctx.storage.getUrl(withTabbed.tabbedHtmlFileId!);
    return url;
  },
});

// Helper function to generate filename from onlineStoreUrl
function generateFilename(onlineStoreUrl: string, variantId?: string): string {
  // Extract the product handle from the URL
  const urlParts = onlineStoreUrl.split("/");
  const productHandle = urlParts[urlParts.length - 1] || "product";

  // Clean the handle to be filesystem-safe
  const cleanHandle = productHandle.replace(/[^a-zA-Z0-9-_]/g, "-");

  // Add variant suffix if provided
  const filename = variantId ? `${cleanHandle}-${variantId}` : cleanHandle;

  return `${filename}.html`;
}

// Save HTML content to file storage
export const saveHtmlFile = action({
  args: {
    htmlContent: v.string(),
    filename: v.string(),
  },
  returns: v.id("_storage"),
  handler: async (ctx, { htmlContent, filename }): Promise<Id<"_storage">> => {
    // Convert HTML string to Blob
    const htmlBlob = new Blob([htmlContent], { type: "text/html" });

    // Store the file
    const fileId: Id<"_storage"> = await ctx.storage.store(htmlBlob);

    return fileId;
  },
});

// Create a new NIP with file storage
export const createNipWithFile = action({
  args: {
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    templateType: v.string(),
    content: v.any(), // Flexible content structure for different templates
    htmlContent: v.string(),
  },
  returns: v.id("nips"),
  handler: async (ctx, args): Promise<Id<"nips">> => {
    // Get product info to generate filename
    const products = await ctx.runQuery(api.products.getAllProducts);
    const product = products.find((p) => p._id === args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Generate filename from onlineStoreUrl
    const filename = generateFilename(product.onlineStoreUrl, args.variantId);

    // Save HTML file to storage
    const htmlFileId: Id<"_storage"> = await ctx.runAction(
      api.nips.saveHtmlFile,
      {
        htmlContent: args.htmlContent,
        filename,
      }
    );

    // Create NIP record with file reference
    const nipId: Id<"nips"> = await ctx.runMutation(api.nips.createNip, {
      ...args,
      htmlFileId,
    });

    return nipId;
  },
});

// Create a new NIP (internal function)
export const createNip = mutation({
  args: {
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    templateType: v.string(),
    region: v.optional(v.string()),
    content: v.any(), // Flexible content structure for different templates
    htmlContent: v.string(),
    htmlFileId: v.optional(v.id("_storage")),
    tabbedHtmlFileId: v.optional(v.id("_storage")),
  },
  returns: v.id("nips"),
  handler: async (ctx, args) => {
    const now = Date.now();

    const nipId = await ctx.db.insert("nips", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });

    return nipId;
  },
});

// Update an existing NIP with file storage
export const updateNipWithFile = action({
  args: {
    nipId: v.id("nips"),
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    templateType: v.string(),
    content: v.any(), // Flexible content structure for different templates
    htmlContent: v.string(),
  },
  returns: v.id("nips"),
  handler: async (ctx, args): Promise<Id<"nips">> => {
    // Get product info to generate filename
    const products = await ctx.runQuery(api.products.getAllProducts);
    const product = products.find((p) => p._id === args.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    // Generate filename from onlineStoreUrl
    const filename = generateFilename(product.onlineStoreUrl, args.variantId);

    // Save updated HTML file to storage
    const htmlFileId: Id<"_storage"> = await ctx.runAction(
      api.nips.saveHtmlFile,
      {
        htmlContent: args.htmlContent,
        filename,
      }
    );

    // Update NIP record with new file reference
    const nipId: Id<"nips"> = await ctx.runMutation(api.nips.updateNip, {
      ...args,
      htmlFileId,
    });

    return nipId;
  },
});

// Create NIP with tabbed HTML file storage for all variants
export const createNipWithTabbedFile = action({
  args: {
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    templateType: v.string(),
    content: v.any(),
    htmlContent: v.string(),
  },
  returns: v.object({
    nipId: v.id("nips"),
    fileUrl: v.string(),
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{
    nipId: Id<"nips">;
    fileUrl: string;
    success: boolean;
    message: string;
  }> => {
    try {
      // First save the individual NIP
      const nipId: Id<"nips"> = await ctx.runAction(
        api.nips.createNipWithFile,
        args
      );

      // Generate tabbed HTML for all variants of the product
      const tabbedHtmlResult: {
        success: boolean;
        message: string;
        html: string;
        variantCount: number;
      } = await ctx.runQuery(api.nips.generateTabbedProductHtml, {
        productId: args.productId,
        templateType: args.templateType,
      });

      if (!tabbedHtmlResult.success) {
        return {
          nipId,
          fileUrl: "",
          success: false,
          message: tabbedHtmlResult.message,
        };
      }

      // Get product info to generate tabbed filename
      const products: any[] = await ctx.runQuery(api.products.getAllProducts);
      const product = products.find((p: any) => p._id === args.productId);
      if (!product) {
        throw new Error("Product not found");
      }

      // Generate tabbed filename (without variant suffix)
      const tabbedFilename =
        generateFilename(product.onlineStoreUrl) + "_tabbed";

      // Save tabbed HTML file to storage
      const tabbedFileId: Id<"_storage"> = await ctx.runAction(
        api.nips.saveHtmlFile,
        {
          htmlContent: tabbedHtmlResult.html,
          filename: tabbedFilename,
        }
      );

      // Get the public URL for the tabbed file
      const fileUrl = await ctx.storage.getUrl(tabbedFileId);

      // Update the NIP record with tabbed file reference
      await ctx.runMutation(api.nips.updateNip, {
        nipId,
        productId: args.productId,
        variantId: args.variantId,
        templateType: args.templateType,
        content: args.content,
        htmlContent: args.htmlContent,
        tabbedHtmlFileId: tabbedFileId,
      });

      return {
        nipId,
        fileUrl: fileUrl || "",
        success: true,
        message: `Tabbed NIP saved successfully with ${tabbedHtmlResult.variantCount} variant(s)`,
      };
    } catch (error) {
      console.error("Error creating NIP with tabbed file:", error);
      throw error;
    }
  },
});

// Update NIP with tabbed HTML file storage for all variants
export const updateNipWithTabbedFile = action({
  args: {
    nipId: v.id("nips"),
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    templateType: v.string(),
    content: v.any(),
    htmlContent: v.string(),
  },
  returns: v.object({
    nipId: v.id("nips"),
    fileUrl: v.string(),
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (
    ctx,
    args
  ): Promise<{
    nipId: Id<"nips">;
    fileUrl: string;
    success: boolean;
    message: string;
  }> => {
    try {
      // First update the individual NIP
      const nipId: Id<"nips"> = await ctx.runAction(
        api.nips.updateNipWithFile,
        args
      );

      // Generate tabbed HTML for all variants of the product
      const tabbedHtmlResult: {
        success: boolean;
        message: string;
        html: string;
        variantCount: number;
      } = await ctx.runQuery(api.nips.generateTabbedProductHtml, {
        productId: args.productId,
        templateType: args.templateType,
      });

      if (!tabbedHtmlResult.success) {
        return {
          nipId,
          fileUrl: "",
          success: false,
          message: tabbedHtmlResult.message,
        };
      }

      // Get product info to generate tabbed filename
      const products: any[] = await ctx.runQuery(api.products.getAllProducts);
      const product = products.find((p: any) => p._id === args.productId);
      if (!product) {
        throw new Error("Product not found");
      }

      // Generate tabbed filename (without variant suffix)
      const tabbedFilename =
        generateFilename(product.onlineStoreUrl) + "_tabbed";

      // Save tabbed HTML file to storage
      const tabbedFileId: Id<"_storage"> = await ctx.runAction(
        api.nips.saveHtmlFile,
        {
          htmlContent: tabbedHtmlResult.html,
          filename: tabbedFilename,
        }
      );

      // Get the public URL for the tabbed file
      const fileUrl = await ctx.storage.getUrl(tabbedFileId);

      // Update the NIP record with tabbed file reference
      await ctx.runMutation(api.nips.updateNip, {
        nipId: args.nipId,
        productId: args.productId,
        variantId: args.variantId,
        templateType: args.templateType,
        content: args.content,
        htmlContent: args.htmlContent,
        tabbedHtmlFileId: tabbedFileId,
      });

      return {
        nipId,
        fileUrl: fileUrl || "",
        success: true,
        message: `Tabbed NIP updated successfully with ${tabbedHtmlResult.variantCount} variant(s)`,
      };
    } catch (error) {
      console.error("Error updating NIP with tabbed file:", error);
      throw error;
    }
  },
});

// Update an existing NIP (internal function)
export const updateNip = mutation({
  args: {
    nipId: v.id("nips"),
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    templateType: v.string(),
    content: v.any(), // Flexible content structure for different templates
    htmlContent: v.string(),
    htmlFileId: v.optional(v.id("_storage")),
    tabbedHtmlFileId: v.optional(v.id("_storage")),
    region: v.optional(v.string()),
  },
  returns: v.id("nips"),
  handler: async (
    ctx,
    {
      nipId,
      productId,
      variantId,
      templateType,
      content,
      htmlContent,
      htmlFileId,
      tabbedHtmlFileId,
      region,
    }
  ) => {
    const patch: any = {
      productId,
      variantId,
      templateType,
      content,
      htmlContent,
      updatedAt: Date.now(),
    };
    if (typeof htmlFileId !== "undefined") patch.htmlFileId = htmlFileId;
    if (typeof tabbedHtmlFileId !== "undefined")
      patch.tabbedHtmlFileId = tabbedHtmlFileId;
    if (typeof region !== "undefined") patch.region = region;
    await ctx.db.patch(nipId, patch);

    return nipId;
  },
});

// Delete a NIP
export const deleteNip = mutation({
  args: {
    nipId: v.id("nips"),
  },
  handler: async (ctx, { nipId }) => {
    await ctx.db.delete(nipId);
    return { success: true };
  },
});

// Delete all NIPs for a product and its variants
export const deleteAllNipsForProduct = mutation({
  args: {
    productId: v.id("products"),
  },
  returns: v.object({
    success: v.boolean(),
    deletedCount: v.number(),
    message: v.string(),
  }),
  handler: async (ctx, { productId }) => {
    // Get all NIPs for this product
    const nips = await ctx.db
      .query("nips")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();

    if (nips.length === 0) {
      return {
        success: false,
        deletedCount: 0,
        message: "No NIPs found for this product",
      };
    }

    // Delete all HTML files associated with these NIPs
    for (const nip of nips) {
      if (nip.htmlFileId) {
        try {
          await ctx.storage.delete(nip.htmlFileId);
        } catch (error) {
          // Continue even if file deletion fails
          console.warn(`Failed to delete HTML file ${nip.htmlFileId}:`, error);
        }
      }
    }

    // Delete all NIP records
    for (const nip of nips) {
      await ctx.db.delete(nip._id);
    }

    return {
      success: true,
      deletedCount: nips.length,
      message: `Successfully deleted ${nips.length} NIP(s) and associated files for this product`,
    };
  },
});

// Generate combined HTML for all variants of a product
// Generate tabbed HTML with JavaScript for variant switching
export const generateTabbedProductHtml = query({
  args: {
    productId: v.id("products"),
    templateType: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    html: v.string(),
    variantCount: v.number(),
  }),
  handler: async (ctx, { productId, templateType }) => {
    // Get all NIPs for this product
    const nips = await ctx.db
      .query("nips")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();

    // Optionally filter by templateType (e.g., US only)
    const filtered = templateType
      ? nips.filter((n) => n.templateType === templateType)
      : nips;

    if (filtered.length === 0) {
      return {
        success: false,
        message: "No NIPs found for this product",
        html: "",
        variantCount: 0,
      };
    }

    // Get product information
    const product = await ctx.db.get(productId);
    if (!product) {
      return {
        success: false,
        message: "Product not found",
        html: "",
        variantCount: 0,
      };
    }

    // Build variant data for tabs
    const variantData = [] as { id: string; name: string; templateType: string; htmlContent: string }[];
    for (let i = 0; i < filtered.length; i++) {
      const nip = filtered[i];
      // Skip entries without HTML to avoid blank tabs
      if (!nip.htmlContent || (typeof nip.htmlContent === "string" && nip.htmlContent.trim() === "")) {
        continue;
      }

      // Get variant information if available
      let variantName = "Default Variant";
      if (nip.variantId) {
        const variant = await ctx.db.get(nip.variantId);
        if (variant) {
          variantName = variant.title || `Variant ${i + 1}`;
        }
      }

      variantData.push({
        id: `variant-${i}`,
        name: variantName,
        templateType: nip.templateType,
        htmlContent: nip.htmlContent,
      });
    }

    // If no variants with HTML, abort
    if (variantData.length === 0) {
      return {
        success: false,
        message: "No NIPs with HTML content found for this product",
        html: "",
        variantCount: 0,
      };
    }
    // Check if we have only one variant - if so, generate simple HTML without tabs
    if (variantData.length === 1) {
      const singleVariant = variantData[0];
      const simpleHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${product.title} - Nutritional Information Panel</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 1200px;
              margin: 0 auto;
              background: white;
              padding: 20px;
            }
            .product-header {
              text-align: center;
              margin-bottom: 40px;
              border-bottom: 3px solid #333;
              padding-bottom: 20px;
            }
            .product-header h1 {
              font-size: 28px;
              font-weight: bold;
              margin: 0;
              color: #333;
            }
            .product-header p {
              font-size: 16px;
              color: #666;
              margin: 10px 0 0 0;
            }
            .content {
              padding: 20px;
              border: 1px solid #ddd;
              border-radius: 5px;
              background: white;
              margin-bottom: 30px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #eee;
              color: #666;
              font-size: 12px;
            }
            .print-button {
              background: #28a745;
              color: white;
              border: none;
              padding: 10px 20px;
              border-radius: 5px;
              cursor: pointer;
              font-size: 14px;
              margin: 10px 5px;
              transition: background 0.3s ease;
            }
            .print-button:hover {
              background: #218838;
            }
            @media print {
              .print-button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="content">
            ${singleVariant.htmlContent}
          </div>

          <div class="footer">
            <p>Generated on ${new Date().toLocaleDateString()} - NIP for ${product.title}</p>
          </div>
        </body>
        </html>
      `;

      return {
        success: true,
        message: `Simple HTML generated for single variant`,
        html: simpleHtml,
        variantCount: nips.length,
      };
    }

    // Generate tabbed HTML with embedded JavaScript for multiple variants
    const tabbedHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${product.title} - Nutritional Information Panel</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            padding: 20px;
          }
          .product-header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 3px solid #333;
            padding-bottom: 20px;
          }
          .product-header h1 {
            font-size: 28px;
            font-weight: bold;
            margin: 0;
            color: #333;
          }
          .product-header p {
            font-size: 16px;
            color: #666;
            margin: 10px 0 0 0;
          }
          .tab-container {
            margin-bottom: 30px;
          }
          .tab-buttons {
            display: flex;
            border-bottom: 2px solid #ddd;
            margin-bottom: 20px;
            flex-wrap: wrap;
          }
          .tab-button {
            background: #f8f9fa;
            border: none;
            padding: 12px 20px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            color: #666;
            border-bottom: 3px solid transparent;
            transition: all 0.3s ease;
            margin-right: 5px;
            margin-bottom: 5px;
          }
          .tab-button:hover {
            background: #e9ecef;
            color: #333;
          }
          .tab-button.active {
            background: white;
            color: #007bff;
            border-bottom-color: #007bff;
          }
          .tab-content {
            display: none;
            padding: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
            background: white;
          }
          .tab-content.active {
            display: block;
          }
          .variant-info {
            background: #f8f9fa;
            padding: 10px 15px;
            margin-bottom: 20px;
            border-left: 4px solid #007bff;
            border-radius: 3px;
          }
          .variant-info h3 {
            margin: 0 0 5px 0;
            color: #007bff;
            font-size: 16px;
          }
          .variant-info p {
            margin: 0;
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #eee;
            color: #666;
            font-size: 12px;
          }
          .print-button {
            background: #28a745;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            margin: 10px 5px;
            transition: background 0.3s ease;
          }
          .print-button:hover {
            background: #218838;
          }
          @media print {
            .tab-buttons, .print-button { display: none; }
            .tab-content { display: block !important; border: none; padding: 0; }
            .tab-content:not(.active) { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <div class="tab-container">
          <div class="tab-buttons">
            ${variantData
              .map(
                (variant, index) =>
                  `<button class="tab-button ${index === 0 ? "active" : ""}" onclick="showTab('${variant.id}')">${variant.name}</button>`
              )
              .join("")}
          </div>

          ${variantData
            .map(
              (variant, index) => `
            <div id="${variant.id}" class="tab-content ${index === 0 ? "active" : ""}">
              
              ${variant.htmlContent}
            </div>
          `
            )
            .join("")}
        </div>

        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString()} - Interactive NIP for ${product.title}</p>
          <p>Total Variants: ${nips.length}</p>
        </div>

        <script>
          function showTab(tabId) {
            // Hide all tab contents
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => {
              content.classList.remove('active');
            });

            // Remove active class from all buttons
            const tabButtons = document.querySelectorAll('.tab-button');
            tabButtons.forEach(button => {
              button.classList.remove('active');
            });

            // Show selected tab content
            const selectedTab = document.getElementById(tabId);
            if (selectedTab) {
              selectedTab.classList.add('active');
            }

            // Add active class to clicked button
            const clickedButton = event.target;
            clickedButton.classList.add('active');
          }

          // Initialize first tab as active on page load
          document.addEventListener('DOMContentLoaded', function() {
            const firstTab = document.querySelector('.tab-content');
            const firstButton = document.querySelector('.tab-button');
            if (firstTab) firstTab.classList.add('active');
            if (firstButton) firstButton.classList.add('active');
          });
        </script>
      </body>
      </html>
    `;

    return {
      success: true,
      message: `Tabbed HTML generated for ${nips.length} variant(s)`,
      html: tabbedHtml,
      variantCount: nips.length,
    };
  },
});

export const generateCombinedProductHtml = query({
  args: {
    productId: v.id("products"),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    html: v.string(),
    variantCount: v.number(),
  }),
  handler: async (
    ctx,
    { productId }
  ): Promise<{
    success: boolean;
    message: string;
    html: string;
    variantCount: number;
  }> => {
    // Get all NIPs for this product
    const nips = await ctx.db
      .query("nips")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();

    if (nips.length === 0) {
      return {
        success: false,
        message: "No NIPs found for this product",
        html: "",
        variantCount: 0,
      };
    }

    // Get product information
    const product = await ctx.db.get(productId);
    if (!product) {
      return {
        success: false,
        message: "Product not found",
        html: "",
        variantCount: 0,
      };
    }

    // Start building combined HTML
    let combinedHtml = `
      <div class="combined-product-nip" style="font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; background: white; padding: 20px;">
        <div class="product-header" style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #333; padding-bottom: 20px;">
          <h1 style="font-size: 28px; font-weight: bold; margin: 0; color: #333;">${product.title}</h1>
          <p style="font-size: 16px; color: #666; margin: 10px 0 0 0;">Complete Nutritional Information Panel - All Variants</p>
        </div>
    `;

    // Group NIPs by variant and add each variant's content
    for (let i = 0; i < nips.length; i++) {
      const nip = nips[i];

      // Get variant information if available
      let variantName = "Default Variant";
      if (nip.variantId) {
        const variant = await ctx.db.get(nip.variantId);
        if (variant) {
          variantName = variant.title || `Variant ${i + 1}`;
        }
      }

      // Add variant section
      combinedHtml += `
        <div class="variant-section" style="margin-bottom: 50px; ${i < nips.length - 1 ? "border-bottom: 2px solid #eee; padding-bottom: 40px;" : ""}">
          <div class="variant-header" style="background: #f8f9fa; padding: 15px; margin-bottom: 20px; border-left: 5px solid #007bff;">
            <h2 style="font-size: 20px; font-weight: bold; margin: 0; color: #007bff;">${variantName}</h2>
            <p style="font-size: 12px; color: #666; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Template: ${nip.templateType.replace("_", " ")}</p>
          </div>
          <div class="variant-content" style="padding: 0 10px;">
            ${nip.htmlContent}
          </div>
        </div>
      `;
    }

    // Close the combined HTML
    combinedHtml += `
        <div class="footer" style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #eee; color: #666; font-size: 12px;">
          <p>Generated on ${new Date().toLocaleDateString()} - Combined NIP for ${product.title}</p>
          <p>Total Variants: ${nips.length}</p>
        </div>
      </div>
    `;

    return {
      success: true,
      message: `Combined HTML generated for ${nips.length} variant(s)`,
      html: combinedHtml,
      variantCount: nips.length,
    };
  },
});
