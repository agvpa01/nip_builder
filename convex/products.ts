import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

// Check if current user is admin (helper function)
async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Must be authenticated");
  }

  const admin = await ctx.db
    .query("admins")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();

  if (!admin) {
    throw new Error("Admin access required");
  }

  return userId;
}

// Get all products with their variants
export const getAllProducts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const products = await ctx.db.query("products").collect();
    
    const productsWithVariants = await Promise.all(
      products.map(async (product) => {
        const variants = await ctx.db
          .query("productVariants")
          .withIndex("by_product", (q) => q.eq("productId", product._id))
          .collect();
        
        return {
          ...product,
          variants,
        };
      })
    );

    return productsWithVariants;
  },
});

// Sync products from external API
export const syncProducts = action({
  args: {},
  handler: async (ctx) => {
    // Check admin access
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be authenticated");
    }

    const admin = await ctx.runQuery(api.admin.isCurrentUserAdmin);
    if (!admin) {
      throw new Error("Admin access required");
    }

    try {
      // Fetch products from external API
      const response = await fetch(
        "https://ysoc0k44w0os0gkg8k0s0ck8.coolify.vpa.com.au/api/products/simple"
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.data?.products) {
        throw new Error("Invalid API response format");
      }

      const products = data.data.products;
      let syncedCount = 0; // new products added
      let skippedCount = 0; // products already existed
      let variantsAdded = 0; // new variants added to existing products

      // Process each product
      for (const product of products) {
        // Check if product already exists
        const existingProduct = await ctx.runQuery(
          api.products.getProductByUrl,
          {
            onlineStoreUrl: product.onlineStoreUrl,
          }
        );

        if (existingProduct) {
          // Product exists: ensure its variants are up to date (add missing)
          skippedCount++;
          if (
            product.variants &&
            Array.isArray(product.variants) &&
            product.variants.length > 0
          ) {
            const existingVariants = await ctx.runQuery(
              api.products.getVariantsByProduct,
              {
                productId: existingProduct._id,
              }
            );
            const existingTitles = new Set(
              (existingVariants || []).map((v: any) => v.title)
            );
            for (const variant of product.variants) {
              if (!existingTitles.has(variant.title)) {
                await ctx.runMutation(api.products.createProductVariant, {
                  productId: existingProduct._id,
                  title: variant.title,
                  imageUrl: variant.imageUrl,
                });
                variantsAdded++;
              }
            }
          }
        } else {
          // Create new product
          const productId = await ctx.runMutation(api.products.createProduct, {
            title: product.title,
            productType: product.productType,
            onlineStoreUrl: product.onlineStoreUrl,
          });

          // Create variants for the product
          if (product.variants && Array.isArray(product.variants)) {
            for (const variant of product.variants) {
              await ctx.runMutation(api.products.createProductVariant, {
                productId,
                title: variant.title,
                imageUrl: variant.imageUrl,
              });
            }
          }

          syncedCount++;
        }
      }

      return {
        success: true,
        syncedCount,
        skippedCount,
        totalProcessed: products.length,
        variantsAdded,
      };
    } catch (error) {
      console.error("Sync error:", error);
      throw new Error(
        `Failed to sync products: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  },
});

// Get product by online store URL (helper query)
export const getProductByUrl = query({
  args: { onlineStoreUrl: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const product = await ctx.db
      .query("products")
      .withIndex("by_online_store_url", (q) =>
        q.eq("onlineStoreUrl", args.onlineStoreUrl)
      )
      .first();

    return product;
  },
});

// Get all variants for a product
export const getVariantsByProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const variants = await ctx.db
      .query("productVariants")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    return variants;
  },
});

// Create a new product
export const createProduct = mutation({
  args: {
    title: v.string(),
    productType: v.string(),
    onlineStoreUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const productId = await ctx.db.insert("products", {
      title: args.title,
      productType: args.productType,
      onlineStoreUrl: args.onlineStoreUrl,
      syncedAt: Date.now(),
    });

    return productId;
  },
});

// Create a product variant
export const createProductVariant = mutation({
  args: {
    productId: v.id("products"),
    title: v.string(),
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const variantId = await ctx.db.insert("productVariants", {
      productId: args.productId,
      title: args.title,
      imageUrl: args.imageUrl,
    });

    return variantId;
  },
});

// Delete a product and its variants
export const deleteProduct = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // Delete all variants first
    const variants = await ctx.db
      .query("productVariants")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    for (const variant of variants) {
      await ctx.db.delete(variant._id);
    }

    // Delete the product
    await ctx.db.delete(args.productId);

    return { success: true };
  },
});
