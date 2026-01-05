import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// --- PROJECT MANAGEMENT ---

export const getProjects = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // In a real app, you'd also fetch shared projects. 
    // For now, just fetch projects created by this user.
    return await ctx.db
      .query("projects")
      .filter(q => q.eq(q.field("ownerId"), args.userId))
      .collect();
  },
});

export const createProject = mutation({
  args: { title: v.string(), ownerId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projects", {
      title: args.title,
      ownerId: args.ownerId,
      createdAt: Date.now(),
    });
  },
});

export const getProject = query({
    args: { id: v.id("projects") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    }
});

// --- SHAPE MANAGEMENT (NOW WITH PROJECT ID) ---

export const getShapes = query({
  args: { projectId: v.id("projects") }, // Required Arg
  handler: async (ctx, args) => {
    return await ctx.db
      .query("shapes")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

export const addShape = mutation({
  args: {
    projectId: v.id("projects"), // Required Arg
    type: v.string(),
    x: v.number(),
    y: v.number(),
    width: v.number(),
    height: v.number(),
    color: v.string(),
    strokeWidth: v.number(),
    fillOpacity: v.number(),
    points: v.optional(v.array(v.object({ x: v.number(), y: v.number() }))),
    text: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    visible: v.boolean(),
    locked: v.boolean(),
    rotation: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("shapes", args);
  },
});

export const updateShape = mutation({
  args: {
    id: v.id("shapes"),
    updates: v.any(), // Keeping it loose for brevity
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.updates);
  },
});

export const deleteShapes = mutation({
  args: { ids: v.array(v.id("shapes")) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.delete(id);
    }
  },
});