import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. PROJECTS TABLE
  projects: defineTable({
    title: v.string(),
    ownerId: v.id("users"),
    createdAt: v.number(),
  }),

  // 2. SHAPES TABLE (Now with projectId!)
  shapes: defineTable({
    projectId: v.id("projects"), // <--- LINK TO PROJECT
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
  }).index("by_project", ["projectId"]), // Fast search by project

  users: defineTable({
    email: v.string(),
    password: v.string(),
    name: v.string(),
  }).index("by_email", ["email"]),
});