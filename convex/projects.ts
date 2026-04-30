import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { auth } from "./auth";

export const getProjects = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getProject = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    const project = await ctx.db.get(args.id);
    if (!project || project.userId !== userId) return null;
    return project;
  },
});

const planItemValidator = v.object({
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
});

export const createProject = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    targetAudience: v.string(),
    problemSolved: v.string(),
    plan: v.array(planItemValidator), // Strict validator
    createdAt: v.number(),
    launchKit: v.optional(v.any()), // Optional initial launch kit
    savedItems: v.optional(v.array(planItemValidator)),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("No autenticado");
    
    const projectId = await ctx.db.insert("projects", {
      userId,
      name: args.name,
      description: args.description,
      targetAudience: args.targetAudience,
      problemSolved: args.problemSolved,
      createdAt: args.createdAt,
      plan: args.plan,
      launchKit: args.launchKit,
      savedItems: args.savedItems,
    });
    return projectId;
  },
});

export const updateProject = mutation({
  args: {
    id: v.id("projects"),
    // Allow partial updates
    plan: v.optional(v.array(planItemValidator)),
    savedItems: v.optional(v.array(planItemValidator)),
    launchKit: v.optional(v.any()),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    targetAudience: v.optional(v.string()),
    problemSolved: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("No autenticado");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
        throw new Error("No autorizado");
    }

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
  },
});

export const deleteProject = mutation({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("No autenticado");

    const existing = await ctx.db.get(args.id);
    if (!existing || existing.userId !== userId) {
        throw new Error("No autorizado");
    }

    await ctx.db.delete(args.id);
  },
});
