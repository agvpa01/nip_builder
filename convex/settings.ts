import { query, mutation } from "./_generated/server"
import { v } from "convex/values"
import { getAuthUserId } from "@convex-dev/auth/server"

async function requireAdmin(ctx: any) {
  const userId = await getAuthUserId(ctx)
  if (!userId) throw new Error("Must be authenticated")
  const admin = await ctx.db
    .query("admins")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first()
  if (!admin) throw new Error("Admin access required")
  return userId
}

// Get a setting by key (admin only for now)
export const getSetting = query({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    await requireAdmin(ctx)
    const row = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first()
    return row ? row.value : null
  },
})

// Upsert a setting (admin only)
export const setSetting = mutation({
  args: { key: v.string(), value: v.any() },
  handler: async (ctx, { key, value }) => {
    await requireAdmin(ctx)
    const existing = await ctx.db
      .query("adminSettings")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first()
    if (existing) {
      await ctx.db.patch(existing._id, { value })
      return { updated: true }
    } else {
      await ctx.db.insert("adminSettings", { key, value })
      return { created: true }
    }
  },
})

