import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,
  projects: defineTable({
    userId: v.id("users"), // Associated user
    name: v.string(),
    description: v.string(),
    targetAudience: v.string(),
    problemSolved: v.string(),
    createdAt: v.number(),
    // Embed plan items directly
    plan: v.array(
      v.object({
        id: v.string(),
        week: v.string(), // WeekPhase enum
        contentType: v.string(),
        title: v.string(),
        angle: v.string(),
        isTrend: v.boolean(),
        trendContext: v.optional(v.string()),
        status: v.string(), // ContentStatus enum
        copy: v.optional(v.string()),
        imageUrl: v.optional(v.string()),
      })
    ),
    // Saved items
    savedItems: v.optional(
      v.array(
        v.object({
          id: v.string(),
          week: v.string(),
          contentType: v.string(),
          title: v.string(),
          angle: v.string(),
          isTrend: v.boolean(),
          trendContext: v.optional(v.string()),
          status: v.string(),
          copy: v.optional(v.string()),
          imageUrl: v.optional(v.string()),
          imageUrls: v.optional(v.array(v.string())),
        })
      )
    ),
    // Launch Kit
    launchKit: v.optional(
      v.object({
        emails: v.object({
          status: v.string(),
          content: v.any(), // Flexible for now
        }),
        productHunt: v.object({
          status: v.string(),
          content: v.any(),
        }),
        directories: v.object({
          status: v.string(),
          content: v.any(),
        }),
      })
    ),
  }).index("by_user", ["userId"]),
});
