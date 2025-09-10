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
        : (nip._id ? nip._id.toString() : Math.random().toString(36).slice(2));
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
      if (c && typeof c === 'object') {
        inferredName = c.variantName || c.name || c.title;
      }
      const variantName =
        fetchedVariant?.title && fetchedVariant.title.trim() !== ""
          ? fetchedVariant.title
          : (typeof inferredName === 'string' && inferredName.trim() !== ''
              ? inferredName
              : `Variant ${variantIndex}`);

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
              max-width: 1200px;
              margin: 0 auto;
              background: white;
              padding: 0;
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
            .content { padding: 0; border: none; border-radius: 0; background: white; margin: 0; }
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
            padding: 0; /* Remove outer body padding */
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
          .tab-container { margin: 0; }
          /* Dropdown-styled tab selector */
          .tab-buttons {
            position: relative;
            display: inline-block;
            margin-bottom: 10px; /* tighter spacing above content */
          }
          .dropdown-toggle {
            background: #3b82f6; /* blue */
            color: #ffffff;
            border: none;
            padding: 10px 14px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05), 0 4px 10px rgba(59,130,246,0.25);
            transition: background 0.2s ease;
          }
          .dropdown-toggle:hover { background: #2563eb; }
          .caret { font-size: 12px; opacity: 0.95; transition: transform 0.2s ease; }
          .tab-buttons.open .caret { transform: rotate(180deg); }
          .dropdown-menu {
            position: absolute;
            top: calc(100% + 6px);
            left: 0;
            background: #ffffff;
            border-radius: 10px;
            min-width: 220px;
            box-shadow: 0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05);
            padding: 6px 0;
            z-index: 1000;
            display: none;
          }
          .tab-buttons.open .dropdown-menu { display: block; }
          /* Individual tab buttons inside dropdown */
          .dropdown-menu .tab-button {
            background: transparent;
            width: 100%;
            text-align: left;
            border: none;
            padding: 10px 14px;
            margin: 0;
            font-size: 14px;
            color: #374151; /* gray-700 */
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.15s ease, color 0.15s ease;
          }
          .dropdown-menu .tab-button:hover { background: #f3f4f6; color: #111827; }
          .dropdown-menu .tab-button.active { background: #eff6ff; color: #2563eb; }
          .tab-content {
            display: none;
            padding: 0; /* remove inner padding */
            border: none; /* remove border */
            border-radius: 0;
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
        <!-- Inline styles duplicated here so content works when only <body> is injected without <head> -->
        <style>
          .tab-container { margin: 0; }
          .tab-buttons { position: relative; display: inline-block; margin-bottom: 10px; }
          .dropdown-toggle { background:#3b82f6;color:#fff;border:none;padding:10px 14px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;display:inline-flex;align-items:center;gap:8px;box-shadow:0 1px 2px rgba(0,0,0,0.05),0 4px 10px rgba(59,130,246,0.25); }
          .dropdown-toggle:hover { background:#2563eb; }
          .caret { font-size:12px;opacity:.95;transition:transform .2s ease; }
          .tab-buttons.open .caret { transform: rotate(180deg); }
          .dropdown-menu { position:absolute;top:calc(100% + 6px);left:0;background:#fff;border-radius:10px;min-width:220px;box-shadow:0 10px 15px rgba(0,0,0,.1),0 4px 6px rgba(0,0,0,.05);padding:6px 0;z-index:1000;display:none; }
          .tab-buttons.open .dropdown-menu { display:block; }
          .dropdown-menu .tab-button { background:transparent;width:100%;text-align:left;border:none;padding:10px 14px;margin:0;font-size:14px;color:#374151;border-radius:6px;cursor:pointer; }
          .dropdown-menu .tab-button:hover { background:#f3f4f6;color:#111827; }
          .dropdown-menu .tab-button.active { background:#eff6ff;color:#2563eb; }
          .tab-content { display:none;padding:0;border:none;border-radius:0;background:#fff; }
          .tab-content.active { display:block; }
        </style>
        <div class="tab-container">
          <div class="tab-buttons">
            <button class="dropdown-toggle" onclick="toggleDropdown()">
              <span class="dropdown-label">${(variantData[0] && variantData[0].name) || "Select Variant"}</span>
              <span class="caret">▾</span>
            </button>
            <div class="dropdown-menu">
              ${variantData
                .map(
                  (variant, index) =>
                    `<button class=\"tab-button ${index === 0 ? "active" : ""}\" onclick=\"showTab('${variant.id}', this)\">${variant.name}</button>`
                )
                .join("")}
            </div>
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


        <script>
          function showTab(tabId, btn) {
            // Hide all tab contents
            const tabContents = document.querySelectorAll('.tab-content');
            tabContents.forEach(content => {
              content.classList.remove('active');
            });

            // Remove active class from all dropdown buttons
            const tabButtons = document.querySelectorAll('.dropdown-menu .tab-button');
            tabButtons.forEach(button => button.classList.remove('active'));

            // Show selected tab content
            const selectedTab = document.getElementById(tabId);
            if (selectedTab) {
              selectedTab.classList.add('active');
            }

            // Add active class to clicked button
            const clickedButton = btn || (typeof event !== 'undefined' ? event.target : null);
            if (clickedButton) clickedButton.classList.add('active');

            // Update dropdown label and close menu
            const labelEl = document.querySelector('.dropdown-label');
            if (labelEl && clickedButton) labelEl.textContent = (clickedButton.textContent || '').trim();
            const dropdown = document.querySelector('.tab-buttons');
            if (dropdown) dropdown.classList.remove('open');
          }

          function toggleDropdown() {
            const dropdown = document.querySelector('.tab-buttons');
            if (dropdown) dropdown.classList.toggle('open');
          }

          // Close dropdown when clicking outside
          document.addEventListener('click', function(e) {
            const dropdown = document.querySelector('.tab-buttons');
            if (!dropdown) return;
            if (!dropdown.contains(e.target)) {
              dropdown.classList.remove('open');
            }
          });

          // Initialize first tab as active on page load
          document.addEventListener('DOMContentLoaded', function() {
            const container = document.querySelector('.tab-buttons');
            if (container && !container.querySelector('.dropdown-toggle')) {
              // Progressive enhancement: convert flat buttons into dropdown structure
              const existingButtons = Array.from(container.querySelectorAll('.tab-button'));
              const toggle = document.createElement('button');
              toggle.className = 'dropdown-toggle';
              const labelSpan = document.createElement('span');
              labelSpan.className = 'dropdown-label';
              labelSpan.textContent = (existingButtons[0]?.textContent || 'Select Variant').trim();
              const caretSpan = document.createElement('span');
              caretSpan.className = 'caret';
              caretSpan.textContent = '▾';
              toggle.appendChild(labelSpan);
              toggle.appendChild(caretSpan);
              toggle.addEventListener('click', toggleDropdown);

              const menu = document.createElement('div');
              menu.className = 'dropdown-menu';
              existingButtons.forEach((b, i) => {
                b.classList.remove('active');
                // Ensure inline handler passes the button as second arg when clicked
                // If not present, add a listener that calls showTab using its text/onclick
                const onclickAttr = b.getAttribute('onclick');
                if (!onclickAttr || !onclickAttr.includes('this')) {
                  const match = onclickAttr && onclickAttr.match(/showTab\('([^']+)'\)/);
                  const id = match ? match[1] : null;
                  if (id) {
                    b.onclick = function() { showTab(id, b); };
                  }
                }
                menu.appendChild(b);
              });

              // Clear and rebuild
              container.innerHTML = '';
              container.appendChild(toggle);
              container.appendChild(menu);
            }

            const firstTab = document.querySelector('.tab-content');
            const firstButton = document.querySelector('.dropdown-menu .tab-button');
            if (firstTab) firstTab.classList.add('active');
            if (firstButton) firstButton.classList.add('active');
          });
        </script>
      </body>
      </html>
    `;

    return {
      success: true,
      message: `Tabbed HTML generated for ${variantData.length} variant(s)`,
      html: tabbedHtml,
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
