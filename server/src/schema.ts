import { z } from 'zod';

// Post schema with proper numeric handling
export const postSchema = z.object({
  id: z.number(),
  title: z.string(),
  content: z.string(),
  price: z.number().positive(), // Stored as numeric in DB, but we use number in TS
  posted_at: z.coerce.date(), // Automatically converts string timestamps to Date objects
  expires_at: z.coerce.date(), // Calculated as posted_at + 24 hours
  is_active: z.boolean(), // Computed field based on current time vs expires_at
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Post = z.infer<typeof postSchema>;

// Input schema for creating posts
export const createPostInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  price: z.number().positive("Price must be positive")
});

export type CreatePostInput = z.infer<typeof createPostInputSchema>;

// Input schema for updating posts
export const updatePostInputSchema = z.object({
  id: z.number(),
  title: z.string().min(1, "Title is required").optional(),
  content: z.string().min(1, "Content is required").optional(),
  price: z.number().positive("Price must be positive").optional()
});

export type UpdatePostInput = z.infer<typeof updatePostInputSchema>;

// Input schema for re-posting expired posts
export const repostInputSchema = z.object({
  id: z.number()
});

export type RepostInput = z.infer<typeof repostInputSchema>;

// Input schema for getting a single post
export const getPostInputSchema = z.object({
  id: z.number()
});

export type GetPostInput = z.infer<typeof getPostInputSchema>;

// Input schema for deleting posts
export const deletePostInputSchema = z.object({
  id: z.number()
});

export type DeletePostInput = z.infer<typeof deletePostInputSchema>;