import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const ACCORDION_SETTINGS_KEY = "productAccordionItems";

type AccordionItem = {
  id: string;
  title: string;
  content: string;
};

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

function normalizeProductSlug(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed.length) {
    return null;
  }

  let candidate = trimmed;
  if (/^https?:\/\//i.test(candidate)) {
    try {
      const url = new URL(candidate);
      const parts = url.pathname.split("/").filter(Boolean);
      candidate = decodeURIComponent(parts[parts.length - 1] ?? "");
    } catch {
      candidate = trimmed;
    }
  }

  candidate = decodeURIComponent(candidate);
  candidate = candidate.replace(/^\/+/, "").replace(/\/+$/, "");
  candidate = candidate.replace(/^products\//i, "");
  if (!candidate.length) {
    return null;
  }
  return candidate.toLowerCase();
}

function sanitizeItems(raw: unknown): AccordionItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw
    .map((entry, index) => {
      const id =
        typeof (entry as any)?.id === "string" &&
        (entry as any).id.trim().length
          ? (entry as any).id.trim()
          : `accordion-item-${index + 1}`;
      const title =
        typeof (entry as any)?.title === "string"
          ? (entry as any).title.trim()
          : "";
      const content =
        typeof (entry as any)?.content === "string"
          ? (entry as any).content
          : "";
      return { id, title, content };
    })
    .filter((item) => item.title.length > 0 || item.content.length > 0);
}

export const getProductAccordion = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, { productId }) => {
    await requireAdmin(ctx);

    const [product, override] = await Promise.all([
      ctx.db.get(productId),
      ctx.db
        .query("productAccordions")
        .withIndex("by_product", (q) => q.eq("productId", productId))
        .first(),
    ]);

    const productSlug = normalizeProductSlug(product?.onlineStoreUrl ?? null);

    if (!override) {
      return {
        hasOverride: false,
        items: null,
        productSlug,
        productTitle: product?.title ?? null,
        updatedAt: null,
        updatedBy: null,
      };
    }

    return {
      hasOverride: true,
      items: sanitizeItems(override.items),
      productSlug,
      productTitle: product?.title ?? null,
      updatedAt: override.updatedAt,
      updatedBy: override.updatedBy ?? null,
    };
  },
});

export const saveProductAccordion = mutation({
  args: {
    productId: v.id("products"),
    items: v.array(
      v.object({
        id: v.string(),
        title: v.string(),
        content: v.string(),
      })
    ),
  },
  handler: async (ctx, { productId, items }) => {
    const userId = await requireAdmin(ctx);
    const sanitizedItems = sanitizeItems(items);
    const product = await ctx.db.get(productId);

    if (!product) {
      throw new Error("Product not found");
    }

    const productSlug = normalizeProductSlug(product.onlineStoreUrl);
    if (!productSlug) {
      throw new Error(
        "Product is missing a valid onlineStoreUrl slug. Update the product before saving an accordion override."
      );
    }

    const existing = await ctx.db
      .query("productAccordions")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        items: sanitizedItems,
        productSlug,
        updatedAt: now,
        updatedBy: userId ?? null,
      });
    } else {
      await ctx.db.insert("productAccordions", {
        productId,
        productSlug,
        items: sanitizedItems,
        updatedAt: now,
        updatedBy: userId ?? null,
      });
    }

    return {
      success: true,
      count: sanitizedItems.length,
      productSlug,
      key: `${ACCORDION_SETTINGS_KEY}:${productSlug}`,
    };
  },
});

export const clearProductAccordion = mutation({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, { productId }) => {
    await requireAdmin(ctx);

    const existing = await ctx.db
      .query("productAccordions")
      .withIndex("by_product", (q) => q.eq("productId", productId))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { success: true, cleared: true };
    }

    return { success: true, cleared: false };
  },
});

export const getProductAccordionPublic = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, { slug }) => {
    const normalized = normalizeProductSlug(slug);
    if (!normalized) {
      return { items: null, slug: null };
    }

    const record = await ctx.db
      .query("productAccordions")
      .withIndex("by_slug", (q) => q.eq("productSlug", normalized))
      .first();

    if (!record) {
      return { items: null, slug: normalized };
    }

    return {
      items: sanitizeItems(record.items),
      slug: record.productSlug,
      updatedAt: record.updatedAt,
    };
  },
});

