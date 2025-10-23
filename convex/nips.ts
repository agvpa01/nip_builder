import { v } from 'convex/values'
import { query, mutation, action } from './_generated/server'
import { api } from './_generated/api'
import { Id } from './_generated/dataModel'

// Helper: infer region from template type
function inferRegion(templateType: string): 'AU' | 'US' {
  const auTemplates = new Set(['protein_powder', 'supplements', 'complex_supplements'])
  if (templateType === 'us_nutrition_facts' || templateType === 'us_supplements') return 'US'
  if (auTemplates.has(templateType)) return 'AU'
  throw new Error(`Unknown templateType '${templateType}' for region inference`)
}

// Check if a NIP exists for a product (and optionally a variant)
export const checkNipExists = query({
  args: {
    productId: v.id('products'),
    variantId: v.optional(v.id('productVariants')),
  },
  handler: async (ctx, { productId, variantId }) => {
    let nip

    if (variantId) {
      // If variantId is provided, look for exact match
      nip = await ctx.db
        .query('nips')
        .withIndex('by_product_variant', (q) =>
          q.eq('productId', productId).eq('variantId', variantId),
        )
        .first()
    } else {
      // If no variantId provided, find any NIP for this product
      nip = await ctx.db
        .query('nips')
        .withIndex('by_product', (q) => q.eq('productId', productId))
        .first()
    }

    return {
      exists: !!nip,
      nip: nip || null,
    }
  },
})

// Get all NIPs for a product (including all variants)
export const getNipsByProduct = query({
  args: {
    productId: v.id('products'),
  },
  returns: v.array(v.any()),
  handler: async (ctx, { productId }) => {
    const nips = await ctx.db
      .query('nips')
      .withIndex('by_product', (q) => q.eq('productId', productId))
      .collect()

    const enriched = await Promise.all(
      nips.map(async (nip) => {
        let variantName: string | null = null
        if (nip.variantId) {
          const variant = await ctx.db.get(nip.variantId)
          variantName = variant?.title ?? null
        }
        return { ...nip, variantName }
      }),
    )

    return enriched
  },
})

// Get all NIPs (for HTTP endpoint)
export const getAllNips = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const nips = await ctx.db.query('nips').collect()
    return nips
  },
})

// Removed storage-backed public URL queries.

// Previously: saveHtmlFile action uploaded HTML to storage.
// Removed per request. We now store HTML inline in the NIP document only.

// Create a new NIP with file storage
export const createNipWithFile = action({
  args: {
    productId: v.id('products'),
    variantId: v.optional(v.id('productVariants')),
    templateType: v.string(),
    content: v.any(), // Flexible content structure for different templates
    htmlContent: v.string(),
  },
  returns: v.id('nips'),
  handler: async (ctx, args): Promise<Id<'nips'>> => {
    // Create NIP record without uploading HTML to storage
    const nipId: Id<'nips'> = await ctx.runMutation(api.nips.createNip, {
      ...args,
    })
    return nipId
  },
})

// Create a new NIP (internal function)
export const createNip = mutation({
  args: {
    productId: v.id('products'),
    variantId: v.optional(v.id('productVariants')),
    templateType: v.string(),
    region: v.optional(v.string()),
    content: v.any(), // Flexible content structure for different templates
    htmlContent: v.string(),
  },
  returns: v.id('nips'),
  handler: async (ctx, args) => {
    const now = Date.now()
    // Ensure region is set based on templateType if not provided
    const ensuredRegion = (args.region as 'AU' | 'US' | undefined) ?? inferRegion(args.templateType)

    const nipId = await ctx.db.insert('nips', {
      ...args,
      region: ensuredRegion,
      createdAt: now,
      updatedAt: now,
    })

    return nipId
  },
})

// Update an existing NIP with file storage
export const updateNipWithFile = action({
  args: {
    nipId: v.id('nips'),
    productId: v.id('products'),
    variantId: v.optional(v.id('productVariants')),
    templateType: v.string(),
    content: v.any(), // Flexible content structure for different templates
    htmlContent: v.string(),
  },
  returns: v.id('nips'),
  handler: async (ctx, args): Promise<Id<'nips'>> => {
    // Update NIP record without uploading HTML to storage
    const nipId: Id<'nips'> = await ctx.runMutation(api.nips.updateNip, {
      ...args,
    })
    return nipId
  },
})

// Create NIP with tabbed HTML file storage for all variants
export const createNipWithTabbedFile = action({
  args: {
    productId: v.id('products'),
    variantId: v.optional(v.id('productVariants')),
    templateType: v.string(),
    content: v.any(),
    htmlContent: v.string(),
  },
  returns: v.object({
    nipId: v.id('nips'),
    fileUrl: v.string(),
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    nipId: Id<'nips'>
    fileUrl: string
    success: boolean
    message: string
  }> => {
    try {
      // First save the individual NIP (no storage upload)
      const nipId: Id<'nips'> = await ctx.runMutation(api.nips.createNip, args)

      // Generate tabbed HTML for all variants of the product
      const tabbedHtmlResult: {
        success: boolean
        message: string
        html: string
        variantCount: number
      } = await ctx.runQuery(api.nips.generateTabbedProductHtml, {
        productId: args.productId,
        templateType: args.templateType,
      })

      if (!tabbedHtmlResult.success) {
        return {
          nipId,
          fileUrl: '',
          success: false,
          message: tabbedHtmlResult.message,
        }
      }

      // Optionally we could store tabbed HTML in the document in the future.
      // For now, skip uploading and just return success without a file URL.

      return {
        nipId,
        fileUrl: '',
        success: true,
        message: `Tabbed NIP saved successfully with ${tabbedHtmlResult.variantCount} variant(s)`,
      }
    } catch (error) {
      console.error('Error creating NIP with tabbed file:', error)
      throw error
    }
  },
})

// Update NIP with tabbed HTML file storage for all variants
export const updateNipWithTabbedFile = action({
  args: {
    nipId: v.id('nips'),
    productId: v.id('products'),
    variantId: v.optional(v.id('productVariants')),
    templateType: v.string(),
    content: v.any(),
    htmlContent: v.string(),
  },
  returns: v.object({
    nipId: v.id('nips'),
    fileUrl: v.string(),
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<{
    nipId: Id<'nips'>
    fileUrl: string
    success: boolean
    message: string
  }> => {
    try {
      // First update the individual NIP (no storage upload)
      const nipId: Id<'nips'> = await ctx.runMutation(api.nips.updateNip, args)

      // Generate tabbed HTML for all variants of the product
      const tabbedHtmlResult: {
        success: boolean
        message: string
        html: string
        variantCount: number
      } = await ctx.runQuery(api.nips.generateTabbedProductHtml, {
        productId: args.productId,
        templateType: args.templateType,
      })

      if (!tabbedHtmlResult.success) {
        return {
          nipId,
          fileUrl: '',
          success: false,
          message: tabbedHtmlResult.message,
        }
      }

      // No storage upload; just return success without a file URL.

      return {
        nipId,
        fileUrl: '',
        success: true,
        message: `Tabbed NIP updated successfully with ${tabbedHtmlResult.variantCount} variant(s)`,
      }
    } catch (error) {
      console.error('Error updating NIP with tabbed file:', error)
      throw error
    }
  },
})

// Update an existing NIP (internal function)
export const updateNip = mutation({
  args: {
    nipId: v.id('nips'),
    productId: v.id('products'),
    variantId: v.optional(v.id('productVariants')),
    templateType: v.string(),
    content: v.any(), // Flexible content structure for different templates
    htmlContent: v.string(),
    region: v.optional(v.string()),
  },
  returns: v.id('nips'),
  handler: async (
    ctx,
    { nipId, productId, variantId, templateType, content, htmlContent, region },
  ) => {
    const existing = await ctx.db.get(nipId)
    if (!existing) throw new Error('NIP not found')
    const ensuredRegion =
      (region as 'AU' | 'US' | undefined) ??
      (existing.region as 'AU' | 'US' | undefined) ??
      inferRegion(templateType)
    const patch: any = {
      productId,
      variantId,
      templateType,
      content,
      htmlContent,
      updatedAt: Date.now(),
      region: ensuredRegion,
    }
    await ctx.db.patch(nipId, patch)

    return nipId
  },
})

// Delete a NIP
export const deleteNip = mutation({
  args: {
    nipId: v.id('nips'),
  },
  handler: async (ctx, { nipId }) => {
    await ctx.db.delete(nipId)
    return { success: true }
  },
})

// Delete all NIPs for a product and its variants
export const deleteAllNipsForProduct = mutation({
  args: {
    productId: v.id('products'),
  },
  returns: v.object({
    success: v.boolean(),
    deletedCount: v.number(),
    message: v.string(),
  }),
  handler: async (ctx, { productId }) => {
    // Get all NIPs for this product
    const nips = await ctx.db
      .query('nips')
      .withIndex('by_product', (q) => q.eq('productId', productId))
      .collect()

    if (nips.length === 0) {
      return {
        success: false,
        deletedCount: 0,
        message: 'No NIPs found for this product',
      }
    }

    // Delete all NIP records
    for (const nip of nips) {
      await ctx.db.delete(nip._id)
    }

    return {
      success: true,
      deletedCount: nips.length,
      message: `Successfully deleted ${nips.length} NIP(s) for this product`,
    }
  },
})

// One-off: Backfill region for existing NIPs with empty region
export const backfillNipRegions = mutation({
  args: {},
  returns: v.object({ updated: v.number(), skipped: v.number() }),
  handler: async (ctx) => {
    const nips = await ctx.db.query('nips').collect()
    let updated = 0
    let skipped = 0
    for (const n of nips) {
      if (!n.region) {
        try {
          const region = inferRegion(n.templateType)
          await ctx.db.patch(n._id, { region, updatedAt: Date.now() })
          updated++
        } catch (e) {
          // Unknown template type; skip
          skipped++
        }
      } else {
        skipped++
      }
    }
    return { updated, skipped }
  },
})

// Generate combined HTML for all variants of a product
// Generate tabbed HTML with JavaScript for variant switching
export const generateTabbedProductHtml = query({
  args: {
    productId: v.id("products"),
    templateType: v.optional(v.string()),
    region: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    html: v.string(),
    variantCount: v.number(),
  }),
  handler: async (ctx, { productId, templateType, region }) => {
    // Get all NIPs for this product
    const nips = await ctx.db
      .query("nips")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .collect();

    // Optionally filter by templateType first; otherwise by region; else use all
    let filtered = nips;
    if (templateType) {
      filtered = nips.filter((n) => n.templateType === templateType);
    } else if (region) {
      filtered = nips.filter((n) => (n as any).region === region);
    }

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
    // Group NIPs by variant and pick the latest non-empty HTML per variant
    type VariantTab = {
      id: string;
      name: string;
      templateType: string;
      htmlContent: string;
    };
    const byVariant = new Map<string, any[]>();
    for (const nip of filtered) {
      // Treat NIPs without a linked product variant as distinct entries
      // so multiple custom variants don't collapse into one tab.
      const key = nip.variantId
        ? nip.variantId.toString()
        : nip._id
          ? nip._id.toString()
          : Math.random().toString(36).slice(2);
      const arr = byVariant.get(key) || [];
      arr.push(nip);
      byVariant.set(key, arr);
    }

    const variantData: VariantTab[] = [];
    let tabIndex = 0;
    for (const [key, arr] of byVariant.entries()) {
      // Choose the most recently updated/created NIP that has non-empty html
      const latestWithHtml = arr
        .filter(
          (n) =>
            !!n.htmlContent &&
            (typeof n.htmlContent !== "string" || n.htmlContent.trim() !== "")
        )
        .sort(
          (a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt)
        )[0];

      if (!latestWithHtml) continue;

      const fetchedVariant = latestWithHtml.variantId
        ? await ctx.db.get(latestWithHtml.variantId as Id<"productVariants">)
        : null;
      const variantIndex = variantData.length + 1;
      // Try to infer a friendly name for custom variants from content
      let inferredName: string | undefined = undefined;
      const c = latestWithHtml.content as any;
      if (c && typeof c === "object") {
        inferredName = c.variantName || c.name || c.title;
      }
      const variantName =
        fetchedVariant?.title && fetchedVariant.title.trim() !== ""
          ? fetchedVariant.title
          : typeof inferredName === "string" && inferredName.trim() !== ""
            ? inferredName
            : `Variant ${variantIndex}`;

      variantData.push({
        id: `variant-${tabIndex++}`,
        name: variantName,
        templateType: latestWithHtml.templateType,
        htmlContent: latestWithHtml.htmlContent,
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
            margin: 0;
            padding: 0;
            width: 100%;
            box-sizing: border-box;
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
            .content { padding: 0; border: none; border-radius: 0; margin: 0; width: 100%; box-sizing: border-box; }
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
            /* Responsive helpers */
            .content { overflow-x: auto; }
            .content img, .content svg, .content canvas, .content video { max-width: 100%; height: auto; }
            .content table { width: 100%; border-collapse: collapse; }
            .content th, .content td { word-break: break-word; }
            @media (max-width: 640px) {
              .product-header { margin-bottom: 20px; padding-bottom: 12px; }
              .product-header h1 { font-size: 20px; }
              .product-header p { font-size: 13px; }
            }
            @media print {
              .print-button { display: none; }
            }
            @media (max-width: 640px) {
            .nip-selector select {
              font-size: 16px;
              min-height: 44px;
              padding: 10px 44px 10px 12px;
            }
            .nip-selector::after {
              right: 12px;
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .nip-selector select {
              transition: none;
            }
          }
          .nip-selector option {
            white-space: normal;
          }
          


          .protein-powder-nip {
            max-width: 100% !important;
          }

          .protein-powder-nip .left-column {
            padding: 10px 0px !important;
          }

          .protein-powder-nip .right-column {
            padding: 10px 0px !important;
          }
        </style>
        </head>
        <body>
          <div class="content">
            ${singleVariant.htmlContent}
          </div>

         
        </body>
        </html>
      `;

      return {
        success: true,
        message: `Simple HTML generated for single variant`,
        html: simpleHtml,
        variantCount: variantData.length,
      };
    }

    // Generate dropdown-controlled HTML for all variants
    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const selectOptions = variantData
      .map((variant, index) => {
        const label = escapeHtml(variant.name ?? `Variant ${index + 1}`);
        return `          <option value="variant-${index}">${label}</option>`;
      })
      .join("");

    const variantMap = Object.fromEntries(
      variantData.map((variant, index) => {
        const key = `variant-${index}`;
        const htmlString =
          typeof variant.htmlContent === "string"
            ? variant.htmlContent
            : String(variant.htmlContent ?? "");
        return [
          key,
          {
            name: variant.name ?? `Variant ${index + 1}`,
            html: htmlString,
          },
        ];
      })
    );
    const serializedVariantMap = JSON.stringify(variantMap)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026")
      .replace(/\\u003c\\\//g, "\\u003c/"); // keep closing tags intact

    const plainHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${product.title} - Nutritional Information</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            width: 100%;
            box-sizing: border-box;
            background: #ffffff;
            color: #111827;
            overflow-x: hidden;
          }
          .nip-wrapper {
            width: 100%;
            max-width: 100%;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 0;
            box-sizing: border-box;
          }
          .nip-selector {
            position: relative;
            width: 100%;
            max-width: 100%;
            margin: 0;
            padding: 0;
            display: block;
            box-sizing: border-box;
          }
          .nip-selector select {
            width: 100%;
            max-width: 100%;
            display: block;
            margin: 0;
            padding: 10px 44px 10px 14px;
            font-size: 14px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            background: #ffffff;
            color: #111827;
            box-sizing: border-box;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
            appearance: none;
            -webkit-appearance: none;
            -moz-appearance: none;
          }
          .nip-selector select::-ms-expand {
            display: none;
          }
          .nip-selector::after {
            content: '';
            position: absolute;
            right: 14px;
            top: 41%;
            margin-top: -3px;
            border-width: 6px 5px 0 5px;
            border-style: solid;
            border-color: #6b7280 transparent transparent transparent;
            pointer-events: none;
          }
          .nip-selector select:hover {
            border-color: #3b82f6;
          }
          .nip-selector select:focus {
            outline: none;
            border-color: #2563eb;
            box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
          }
          .nip-variant {
            margin: 0;
            padding: 0;
          }
          @media (max-width: 640px) {
            .nip-selector select {
              font-size: 13px;
              padding: 8px 34px 8px 12px;
              background-position: calc(100% - 16px) calc(50% - 3px), calc(100% - 10px) calc(50% - 3px), calc(100% - 30px) calc(50% + 10px);
            }
          }
          #nipVariantPanel {
            margin: 0;
            padding: 0;
            width: 100%;
            box-sizing: border-box;
          }
          #nipVariantPanel > * {
            margin: 0;
            width: 100%;
            box-sizing: border-box;
          }

          .protein-powder-nip {
            max-width: 100% !important;
          }

          .protein-powder-nip .left-column {
            padding: 10px 0px !important;
          }

          .protein-powder-nip .right-column {
            padding: 10px 0px !important;
          }
        </style>
      </head>
      <body>
        <div class="nip-wrapper">
          <div class="nip-selector">
            <select id="nipVariantSelect">
              ${selectOptions}
            </select>
          </div>
          <div id="nipVariantPanel" class="nip-variant"></div>
        </div>
        <script>
          (function() {
            var select = document.getElementById('nipVariantSelect');
            var panel = document.getElementById('nipVariantPanel');
            if (!select || !panel) return;
            var variants = ${serializedVariantMap};
            function renderVariant(value) {
              var variant = variants[value];
              if (!variant) return;
              panel.innerHTML = typeof variant.html === 'string' ? variant.html : '';
            }
            var allKeys = Object.keys(variants);
            if (!variants[select.value] && select.options.length) {
              select.value = select.options[0].value;
            }
            if (!variants[select.value] && allKeys.length) {
              select.value = allKeys[0];
            }
            renderVariant(select.value);
            select.addEventListener('change', function() {
              renderVariant(this.value);
            });
          })();
        </script>
      </body>
      </html>
    `;

    return {
      success: true,
      message: `Plain HTML generated for ${variantData.length} variant(s)`,
      html: plainHtml,
      variantCount: variantData.length,
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
      <div class="combined-product-nip" style="font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px;">
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
    // combinedHtml += `
    //     <div class="footer" style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #eee; color: #666; font-size: 12px;">
    //       <p>Generated on ${new Date().toLocaleDateString()} - Combined NIP for ${product.title}</p>
    //       <p>Total Variants: ${nips.length}</p>
    //     </div>
    //   </div>
    // `

    return {
      success: true,
      message: `Combined HTML generated for ${nips.length} variant(s)`,
      html: combinedHtml,
      variantCount: nips.length,
    };
  },
});





