import { serial, text, pgTable, timestamp, numeric, boolean } from 'drizzle-orm/pg-core';

export const postsTable = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(), // Use numeric for monetary values with precision
  posted_at: timestamp('posted_at').defaultNow().notNull(), // When the post was published/re-posted
  expires_at: timestamp('expires_at').notNull(), // Calculated as posted_at + 24 hours
  created_at: timestamp('created_at').defaultNow().notNull(), // When the post was first created
  updated_at: timestamp('updated_at').defaultNow().notNull(), // When the post was last modified
});

// TypeScript types for the table schema
export type Post = typeof postsTable.$inferSelect; // For SELECT operations
export type NewPost = typeof postsTable.$inferInsert; // For INSERT operations

// Important: Export all tables for proper query building
export const tables = { posts: postsTable };