import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  admins: defineTable({
    userId: v.id("users"),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  adminSettings: defineTable({
    key: v.string(),
    value: v.any(),
  }).index("by_key", ["key"]),

  products: defineTable({
    title: v.string(),
    productType: v.string(),
    onlineStoreUrl: v.string(),
    syncedAt: v.number(),
  }).index("by_online_store_url", ["onlineStoreUrl"]),

  productVariants: defineTable({
    productId: v.id("products"),
    title: v.string(),
    imageUrl: v.string(),
  }).index("by_product", ["productId"]),

  nips: defineTable({
    productId: v.id("products"),
    variantId: v.optional(v.id("productVariants")),
    templateType: v.string(), // "protein_powder", "complex_supplements", "supplements"
    region: v.optional(v.string()), // "AU" or "US"
    content: v.any(), // Flexible content structure for different templates
    htmlContent: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_product", ["productId"])
    .index("by_variant", ["variantId"])
    .index("by_product_variant", ["productId", "variantId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
