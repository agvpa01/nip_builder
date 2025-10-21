import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveProfilePicture = mutation({
  args: {
    customerId: v.string(),
    storageId: v.id("_storage"),
    fileName: v.string(),
    contentType: v.string(),
    size: v.number(),
    uploadedBy: v.optional(v.string()),
  },
  returns: v.object({
    pictureId: v.id("profilePictures"),
    imageUrl: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const imageUrl = await ctx.storage.getUrl(args.storageId);

    const existing = await ctx.db
      .query("profilePictures")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        storageId: args.storageId,
        fileName: args.fileName,
        contentType: args.contentType,
        size: args.size,
        imageUrl: imageUrl ?? undefined,
        uploadedBy: args.uploadedBy,
        updatedAt: now,
      });

      if (existing.storageId !== args.storageId) {
        await ctx.storage.delete(existing.storageId);
      }

      return { pictureId: existing._id, imageUrl: imageUrl ?? undefined };
    }

    const pictureId = await ctx.db.insert("profilePictures", {
      customerId: args.customerId,
      storageId: args.storageId,
      fileName: args.fileName,
      contentType: args.contentType,
      size: args.size,
      imageUrl: imageUrl ?? undefined,
      uploadedBy: args.uploadedBy,
      createdAt: now,
      updatedAt: now,
    });

    return { pictureId, imageUrl: imageUrl ?? undefined };
  },
});

export const getProfilePictureByCustomer = query({
  args: {
    customerId: v.string(),
  },
  handler: async (ctx, args) => {
    const record = await ctx.db
      .query("profilePictures")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .first();

    if (!record) return null;

    const imageUrl = record.imageUrl ?? (await ctx.storage.getUrl(record.storageId));

    return {
      id: record._id,
      customerId: record.customerId,
      imageUrl,
      fileName: record.fileName,
      contentType: record.contentType,
      size: record.size,
      updatedAt: record.updatedAt,
      createdAt: record.createdAt,
    };
  },
});

export const listRecentProfilePictures = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const take = Math.max(1, Math.min(args.limit ?? 50, 200));
    const records = await ctx.db.query("profilePictures").collect();
    records.sort((a, b) => b.updatedAt - a.updatedAt);
    const result = await Promise.all(
      records.slice(0, take).map(async (record) => ({
        id: record._id,
        customerId: record.customerId,
        imageUrl: record.imageUrl ?? (await ctx.storage.getUrl(record.storageId)),
        updatedAt: record.updatedAt,
        createdAt: record.createdAt,
      }))
    );
    return result;
  },
});
