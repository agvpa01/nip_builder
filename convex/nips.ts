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

    return nips
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
    productId: v.id('products'),
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
      .query('nips')
      .withIndex('by_product', (q) => q.eq('productId', productId))
      .collect()

    // Optionally filter by templateType first; otherwise by region; else use all
    let filtered = nips
    if (templateType) {
      filtered = nips.filter((n) => n.templateType === templateType)
    } else if (region) {
      filtered = nips.filter((n) => (n as any).region === region)
    }

    if (filtered.length === 0) {
      return {
        success: false,
        message: 'No NIPs found for this product',
        html: '',
        variantCount: 0,
      }
    }

    // Get product information
    const product = await ctx.db.get(productId)
    if (!product) {
      return {
        success: false,
        message: 'Product not found',
        html: '',
        variantCount: 0,
      }
    }

    // Build variant data for tabs
    // Group NIPs by variant and pick the latest non-empty HTML per variant
    type VariantTab = { id: string; name: string; templateType: string; htmlContent: string }
    const byVariant = new Map<string, any[]>()
    for (const nip of filtered) {
      const key = nip.variantId ? nip.variantId.toString() : 'no-variant'
      const arr = byVariant.get(key) || []
      arr.push(nip)
      byVariant.set(key, arr)
    }

    const variantData: VariantTab[] = []
    let tabIndex = 0
    for (const [key, arr] of byVariant.entries()) {
      // Choose the most recently updated/created NIP that has non-empty html
      const latestWithHtml = arr
        .filter(
          (n) =>
            !!n.htmlContent && (typeof n.htmlContent !== 'string' || n.htmlContent.trim() !== ''),
        )
        .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))[0]

      if (!latestWithHtml) continue

      const fetchedVariant = latestWithHtml.variantId
        ? await ctx.db.get(latestWithHtml.variantId as Id<'productVariants'>)
        : null
      const variantIndex = variantData.length + 1
      const variantName =
        fetchedVariant?.title && fetchedVariant.title.trim() !== ''
          ? fetchedVariant.title
          : `Variant ${variantIndex}`

      variantData.push({
        id: `variant-${tabIndex++}`,
        name: variantName,
        templateType: latestWithHtml.templateType,
        htmlContent: latestWithHtml.htmlContent,
      })
    }

    // If no variants with HTML, abort
    if (variantData.length === 0) {
      return {
        success: false,
        message: 'No NIPs with HTML content found for this product',
        html: '',
        variantCount: 0,
      }
    }
    // Check if we have only one variant - if so, generate simple HTML without selector
    if (variantData.length === 1) {
      const singleVariant = variantData[0]
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
      `

      return {
        success: true,
        message: `Simple HTML generated for single variant`,
        html: simpleHtml,
        variantCount: variantData.length,
      }
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
          .tab-container { margin-bottom: 30px; }
          .selector-row { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
          #variantSelect { padding: 8px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
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
            #variantSelect, .print-button, .selector-row { display: none; }
            .tab-content { display: block !important; border: none; padding: 0; }
            .tab-content:not(.active) { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <div class="tab-container">
          <div class="selector-row">
            <label for="variantSelect">Select Variant:</label>
            <select id="variantSelect">
              ${variantData
                .map(
                  (variant, index) =>
                    `<option value="${variant.id}" ${index === 0 ? 'selected' : ''}>${variant.name}</option>`,
                )
                .join('')}
            </select>
          </div>

          ${variantData
            .map(
              (variant, index) => `
            <div id="${variant.id}" class="tab-content ${index === 0 ? 'active' : ''}">
              
              ${variant.htmlContent}
            </div>
          `,
            )
            .join('')}
        </div>

        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString()} - Interactive NIP for ${product.title}</p>
          <p>Total Variants: ${variantData.length}</p>
        </div>

        <script>
          function showTab(tabId) {
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => content.classList.remove('active'));
            const selectedTab = document.getElementById(tabId);
            if (selectedTab) selectedTab.classList.add('active');
          }
          document.addEventListener('DOMContentLoaded', function() {
            const select = document.getElementById('variantSelect');
            if (select) {
              showTab(select.value);
              select.addEventListener('change', function(e) {
                const target = e.target as HTMLSelectElement;
                showTab(target.value);
              });
            }
          });
        </script>
      </body>
      </html>
    `

    return {
      success: true,
      message: `Tabbed HTML generated for ${variantData.length} variant(s)`,
      html: tabbedHtml,
      variantCount: variantData.length,
    }
  },
})

export const generateCombinedProductHtml = query({
  args: {
    productId: v.id('products'),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    html: v.string(),
    variantCount: v.number(),
  }),
  handler: async (
    ctx,
    { productId },
  ): Promise<{
    success: boolean
    message: string
    html: string
    variantCount: number
  }> => {
    // Get all NIPs for this product
    const nips = await ctx.db
      .query('nips')
      .withIndex('by_product', (q) => q.eq('productId', productId))
      .collect()

    if (nips.length === 0) {
      return {
        success: false,
        message: 'No NIPs found for this product',
        html: '',
        variantCount: 0,
      }
    }

    // Get product information
    const product = await ctx.db.get(productId)
    if (!product) {
      return {
        success: false,
        message: 'Product not found',
        html: '',
        variantCount: 0,
      }
    }

    // Start building combined HTML
    let combinedHtml = `
      <div class="combined-product-nip" style="font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; background: white; padding: 20px;">
        <div class="product-header" style="text-align: center; margin-bottom: 40px; border-bottom: 3px solid #333; padding-bottom: 20px;">
          <h1 style="font-size: 28px; font-weight: bold; margin: 0; color: #333;">${product.title}</h1>
          <p style="font-size: 16px; color: #666; margin: 10px 0 0 0;">Complete Nutritional Information Panel - All Variants</p>
        </div>
    `

    // Group NIPs by variant and add each variant's content
    for (let i = 0; i < nips.length; i++) {
      const nip = nips[i]

      // Get variant information if available
      let variantName = 'Default Variant'
      if (nip.variantId) {
        const variant = await ctx.db.get(nip.variantId)
        if (variant) {
          variantName = variant.title || `Variant ${i + 1}`
        }
      }

      // Add variant section
      combinedHtml += `
        <div class="variant-section" style="margin-bottom: 50px; ${i < nips.length - 1 ? 'border-bottom: 2px solid #eee; padding-bottom: 40px;' : ''}">
          <div class="variant-header" style="background: #f8f9fa; padding: 15px; margin-bottom: 20px; border-left: 5px solid #007bff;">
            <h2 style="font-size: 20px; font-weight: bold; margin: 0; color: #007bff;">${variantName}</h2>
            <p style="font-size: 12px; color: #666; margin: 5px 0 0 0; text-transform: uppercase; letter-spacing: 1px;">Template: ${nip.templateType.replace('_', ' ')}</p>
          </div>
          <div class="variant-content" style="padding: 0 10px;">
            ${nip.htmlContent}
          </div>
        </div>
      `
    }

    // Close the combined HTML
    combinedHtml += `
        <div class="footer" style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #eee; color: #666; font-size: 12px;">
          <p>Generated on ${new Date().toLocaleDateString()} - Combined NIP for ${product.title}</p>
          <p>Total Variants: ${nips.length}</p>
        </div>
      </div>
    `

    return {
      success: true,
      message: `Combined HTML generated for ${nips.length} variant(s)`,
      html: combinedHtml,
      variantCount: nips.length,
    }
  },
})
