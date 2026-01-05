import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// 1. SIGN UP (Create User)
export const createAccount = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if email already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Create user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      password: args.password,
      name: args.name,
    });

    return userId;
  },
});

// 2. SIGN IN (Verify User)
export const signIn = query({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (!user) {
      return null; // User not found
    }

    if (user.password !== args.password) {
      return null; // Wrong password
    }

    return user; // Success! Return user data
  },
});