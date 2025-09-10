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

    // Read Shopify config from admin settings
    const shopifyCfg = await ctx.runQuery(api.settings.getSetting as any, {
      key: "shopify",
    });

    const shop =
      shopifyCfg?.shop || shopifyCfg?.domain || process.env.SHOPIFY_SHOP;
    const accessToken =
      shopifyCfg?.accessToken || process.env.SHOPIFY_ACCESS_TOKEN;
    const storefrontToken =
      shopifyCfg?.storefrontToken || process.env.SHOPIFY_STOREFRONT_TOKEN;

    if (!shop || (!accessToken && !storefrontToken)) {
      throw new Error(
        "Missing Shopify credentials. Provide either an Admin API accessToken (read_products) or a Storefront storefrontToken via admin setting 'shopify' or env vars."
      );
    }

    const normalizedShop = (shop as string).replace(/^https?:\/\//, "");
    const mode: "admin" | "storefront" = accessToken ? "admin" : "storefront";
    const endpoint =
      mode === "admin"
        ? `https://${normalizedShop}/admin/api/2024-07/graphql.json`
        : `https://${normalizedShop}/api/2024-07/graphql.json`;

    const adminQuery = `#graphql
      query Products($first: Int!, $after: String) {
        products(first: $first, after: $after, sortKey: UPDATED_AT) {
          edges {
            cursor
            node {
              id
              title
              productType
              handle
              onlineStoreUrl
              variants(first: 100) {
                edges {
                  node {
                    id
                    title
                    image { url }
                  }
                }
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    `;
    const storefrontQuery = `#graphql
      query Products($first: Int!, $after: String) {
        products(first: $first, after: $after) {
          edges {
            cursor
            node {
              id
              title
              productType
              handle
              onlineStoreUrl
              variants(first: 100) {
                edges {
                  node {
                    id
                    title
                    image { url }
                  }
                }
              }
            }
          }
          pageInfo { hasNextPage endCursor }
        }
      }
    `;
    const queryBody = mode === "admin" ? adminQuery : storefrontQuery;

    const doGraphQL = async (variables: any) => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (mode === "admin")
        headers["X-Shopify-Access-Token"] = accessToken as string;
      else
        headers["X-Shopify-Storefront-Access-Token"] =
          storefrontToken as string;

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ query: queryBody, variables }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(
          `Shopify GraphQL error ${res.status}: ${txt || res.statusText}`
        );
      }
      const json = await res.json();
      if (json.errors) {
        // Provide a clearer message for common scope/token issues
        try {
          const errs = Array.isArray(json.errors) ? json.errors : [json.errors];
          const denied = errs.find(
            (e: any) => e?.extensions?.code === "ACCESS_DENIED"
          );
          if (denied) {
            if (mode === "admin") {
              throw new Error(
                "Shopify access denied for 'products'. Ensure your Admin API token has scope 'read_products' and that you are using an Admin token (not a Storefront token)."
              );
            } else {
              throw new Error(
                "Shopify access denied. Ensure your Storefront token is valid and the products are published to the Online Store channel."
              );
            }
          }
        } catch {}
        throw new Error(
          `Shopify GraphQL returned errors: ${JSON.stringify(json.errors)}`
        );
      }
      return json.data;
    };

    let syncedCount = 0; // new products added
    let skippedCount = 0; // products already existed
    let variantsAdded = 0; // new variants added to existing products
    let totalProcessed = 0;

    let after: string | null = null;
    const pageSize = 100; // Shopify max for products per page

    try {
      while (true) {
        const data = await doGraphQL({ first: pageSize, after });
        const edges = data?.products?.edges || [];

        for (const edge of edges) {
          const p = edge.node;
          const productTitle: string = p.title || "Untitled";
          const productType: string = p.productType || "";
          const handle: string = p.handle;
          const urlFromShopify: string | null = p.onlineStoreUrl || null;
          const onlineStoreUrl =
            urlFromShopify ||
            `https://${shop.replace(/^https?:\/\//, "")}/products/${handle}`;

          // Build variants array in the same shape expected downstream
          const variants = (p.variants?.edges || []).map((ve: any) => ({
            title: ve.node?.title || "Default",
            imageUrl: ve.node?.image?.url || "",
          }));

          // Check if product already exists by URL
          const existingProduct = await ctx.runQuery(
            api.products.getProductByUrl,
            {
              onlineStoreUrl,
            }
          );

          if (existingProduct) {
            skippedCount++;
            if (variants.length > 0) {
              const existingVariants = await ctx.runQuery(
                api.products.getVariantsByProduct,
                { productId: existingProduct._id }
              );
              const existingTitles = new Set(
                (existingVariants || []).map((v: any) => v.title)
              );
              for (const variant of variants) {
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
            const productId = await ctx.runMutation(
              api.products.createProduct,
              {
                title: productTitle,
                productType,
                onlineStoreUrl,
              }
            );
            // Create variants
            for (const variant of variants) {
              await ctx.runMutation(api.products.createProductVariant, {
                productId,
                title: variant.title,
                imageUrl: variant.imageUrl,
              });
            }
            syncedCount++;
          }

          totalProcessed++;
        }

        const pageInfo = data?.products?.pageInfo;
        if (pageInfo?.hasNextPage) {
          after = pageInfo.endCursor;
          // small backoff to be kind to rate limits
          await new Promise((r) => setTimeout(r, 150));
        } else {
          break;
        }
      }

      return { success: true, syncedCount, skippedCount, totalProcessed, variantsAdded };
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

// Public: Get product by online store URL (no admin requirement)
export const getProductByOnlineStoreUrlPublic = query({
  args: { onlineStoreUrl: v.string() },
  handler: async (ctx, { onlineStoreUrl }) => {
    // Normalize URL for trailing slash differences and canonical form
    const normalize = (input: string): string => {
      try {
        const u = new URL(input);
        const cleanPath = u.pathname !== "/" && u.pathname.endsWith("/")
          ? u.pathname.slice(0, -1)
          : u.pathname;
        return `${u.protocol}//${u.host}${cleanPath}`;
      } catch {
        return input.trim();
      }
    };

    const primary = normalize(onlineStoreUrl);
    let product = await ctx.db
      .query("products")
      .withIndex("by_online_store_url", (q) => q.eq("onlineStoreUrl", primary))
      .first();

    if (!product) {
      // Try toggling trailing slash
      const alt = primary.endsWith("/") ? primary.slice(0, -1) : `${primary}/`;
      product = await ctx.db
        .query("products")
        .withIndex("by_online_store_url", (q) => q.eq("onlineStoreUrl", alt))
        .first();
    }

    // If not found and input looks like a slug (no scheme/host), try matching by last path segment
    if (!product) {
      const looksLikeSlug = !/^https?:\/\//i.test(primary) && !primary.includes("/");
      if (looksLikeSlug) {
        const slug = primary.toLowerCase();
        const all = await ctx.db.query("products").collect();
        product =
          all.find((p) => {
            try {
              const u = new URL(p.onlineStoreUrl);
              const parts = u.pathname.split("/").filter(Boolean);
              const last = (parts[parts.length - 1] || "").toLowerCase();
              return last === slug;
            } catch {
              const s = p.onlineStoreUrl.toLowerCase();
              return s.endsWith("/" + slug) || s === slug;
            }
          }) || null;
      }
    }

    return product || null;
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

// Delete a single product variant (and cascade delete related NIPs)
export const deleteProductVariant = mutation({
  args: { variantId: v.id("productVariants") },
  handler: async (ctx, { variantId }) => {
    await requireAdmin(ctx);

    // Remove any NIPs that reference this variant to avoid orphans
    const nipsForVariant = await ctx.db
      .query("nips")
      .withIndex("by_variant", (q) => q.eq("variantId", variantId))
      .collect();
    for (const nip of nipsForVariant) {
      await ctx.db.delete(nip._id);
    }

    // Delete the variant
    await ctx.db.delete(variantId);

    return { success: true, deletedNips: nipsForVariant.length };
  },
});
