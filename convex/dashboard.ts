import { query } from "./_generated/server";
import { v } from "convex/values";

export const getDashboardStats = query({
  args: {},
  returns: v.object({
    totalUsers: v.number(),
    totalAdmins: v.number(),
    totalRegularUsers: v.number(),
    totalProducts: v.number(),
    totalNips: v.number(),
    productsWithNips: v.number(),
    productsWithoutNips: v.number(),
    recentActivity: v.array(
      v.object({
        type: v.string(),
        description: v.string(),
        timestamp: v.number(),
        userId: v.optional(v.id("users")),
        productId: v.optional(v.id("products")),
        nipId: v.optional(v.id("nips")),
      })
    ),
    templateTypeStats: v.object({
      proteinPowder: v.number(),
      supplements: v.number(),
      complexSupplements: v.number(),
    }),
    monthlyStats: v.object({
      nipsCreatedThisMonth: v.number(),
      productsAddedThisMonth: v.number(),
      usersJoinedThisMonth: v.number(),
    }),
  }),
  handler: async (ctx) => {
    // Get all data
    const users = await ctx.db.query("users").collect();
    const admins = await ctx.db.query("admins").collect();
    const adminUserIds = new Set(admins.map((a) => a.userId));

    // Calculate basic stats
    const totalUsers = users.length;
    const totalAdmins = admins.length;
    const totalRegularUsers = totalUsers - totalAdmins;

    // Get all products
    const products = await ctx.db.query("products").collect();
    const totalProducts = products.length;

    // Get all NIPs
    const nips = await ctx.db.query("nips").collect();
    const totalNips = nips.length;

    // Calculate products with/without NIPs
    const productIdsWithNips = new Set(nips.map((nip) => nip.productId));
    const productsWithNips = productIdsWithNips.size;
    const productsWithoutNips = totalProducts - productsWithNips;

    // Template type statistics
    const templateTypeStats = {
      proteinPowder: nips.filter((nip) => nip.templateType === "protein-powder")
        .length,
      supplements: nips.filter((nip) => nip.templateType === "supplements")
        .length,
      complexSupplements: nips.filter(
        (nip) => nip.templateType === "complex-supplements"
      ).length,
    };

    // Monthly statistics (current month)
    const now = Date.now();
    const startOfMonth = new Date(
      new Date(now).getFullYear(),
      new Date(now).getMonth(),
      1
    ).getTime();

    const nipsCreatedThisMonth = nips.filter(
      (nip) => nip._creationTime >= startOfMonth
    ).length;
    const productsAddedThisMonth = products.filter(
      (product) => product._creationTime >= startOfMonth
    ).length;
    const usersJoinedThisMonth = users.filter(
      (user) => user._creationTime >= startOfMonth
    ).length;

    // Recent activity (last 10 activities)
    const recentActivity = [];

    // Add recent NIPs
    const recentNips = nips
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 5);

    for (const nip of recentNips) {
      const product = await ctx.db.get(nip.productId);
      recentActivity.push({
        type: "nip_created",
        description: `NIP created for ${product?.title || "Unknown Product"}`,
        timestamp: nip._creationTime,
        productId: nip.productId,
        nipId: nip._id,
      });
    }

    // Add recent products
    const recentProducts = products
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 3);

    for (const product of recentProducts) {
      recentActivity.push({
        type: "product_added",
        description: `Product "${product.title}" was added`,
        timestamp: product._creationTime,
        productId: product._id,
      });
    }

    // Add recent users
    const recentUsers = users
      .sort((a, b) => b._creationTime - a._creationTime)
      .slice(0, 2);

    for (const user of recentUsers) {
      const isAdmin = adminUserIds.has(user._id);
      const userType = isAdmin ? " (Admin)" : "";
      recentActivity.push({
        type: "user_joined",
        description: `${user.name || user.email || "New user"}${userType} joined the system`,
        timestamp: user._creationTime,
        userId: user._id,
      });
    }

    // Sort all activities by timestamp and take the most recent 10
    recentActivity.sort((a, b) => b.timestamp - a.timestamp);
    const limitedRecentActivity = recentActivity.slice(0, 10);

    return {
      totalUsers,
      totalAdmins,
      totalRegularUsers,
      totalProducts,
      totalNips,
      productsWithNips,
      productsWithoutNips,
      recentActivity: limitedRecentActivity,
      templateTypeStats,
      monthlyStats: {
        nipsCreatedThisMonth,
        productsAddedThisMonth,
        usersJoinedThisMonth,
      },
    };
  },
});
