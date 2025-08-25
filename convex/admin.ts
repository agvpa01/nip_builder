import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Check if admin signup is allowed (one-time only)
export const canSignupAdmin = query({
  args: {},
  handler: async (ctx) => {
    const adminCount = await ctx.db.query("admins").collect();
    return adminCount.length === 0;
  },
});

// Create the first admin (one-time signup)
export const createFirstAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be authenticated");
    }

    // Check if any admin exists
    const existingAdmins = await ctx.db.query("admins").collect();
    if (existingAdmins.length > 0) {
      throw new Error("Admin already exists");
    }

    // Create admin record
    await ctx.db.insert("admins", {
      userId,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Check if current user is admin
export const isCurrentUserAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    const admin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    return !!admin;
  },
});

// Get all users (admin only)
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be authenticated");
    }

    // Check if user is admin
    const admin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!admin) {
      throw new Error("Admin access required");
    }

    const users = await ctx.db.query("users").collect();
    return users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      _creationTime: user._creationTime,
      isAdmin: false, // We'll check this separately
    }));
  },
});

// Get users with admin status
export const getUsersWithAdminStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Must be authenticated");
    }

    // Check if user is admin
    const admin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (!admin) {
      throw new Error("Admin access required");
    }

    const users = await ctx.db.query("users").collect();
    const admins = await ctx.db.query("admins").collect();
    const adminUserIds = new Set(admins.map(a => a.userId));

    return users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      _creationTime: user._creationTime,
      isAdmin: adminUserIds.has(user._id),
    }));
  },
});

// Delete user (admin only)
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) {
      throw new Error("Must be authenticated");
    }

    // Check if current user is admin
    const admin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", currentUserId))
      .first();

    if (!admin) {
      throw new Error("Admin access required");
    }

    // Don't allow deleting yourself
    if (args.userId === currentUserId) {
      throw new Error("Cannot delete your own account");
    }

    // Remove admin status if user is admin
    const userAdmin = await ctx.db
      .query("admins")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (userAdmin) {
      await ctx.db.delete(userAdmin._id);
    }

    // Delete the user
    await ctx.db.delete(args.userId);
    return { success: true };
  },
});
