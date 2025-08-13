import { serial, text, pgTable, timestamp, integer, varchar, numeric } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password_hash: text('password_hash').notNull(),
  phone_number: varchar('phone_number', { length: 20 }).notNull(),
  credits: integer('credits').notNull().default(1), // Users start with 1 credit for their first free post
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Posts table
export const postsTable = pgTable('posts', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  image_path: varchar('image_path', { length: 500 }).notNull(),
  expires_at: timestamp('expires_at').notNull(), // 24 hours from creation
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Credit purchases table
export const creditPurchasesTable = pgTable('credit_purchases', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => usersTable.id).notNull(),
  credits_purchased: integer('credits_purchased').notNull(),
  amount_paid: numeric('amount_paid', { precision: 10, scale: 2 }).notNull(),
  payment_method: varchar('payment_method', { length: 50 }).notNull(),
  transaction_id: varchar('transaction_id', { length: 255 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  posts: many(postsTable),
  creditPurchases: many(creditPurchasesTable),
}));

export const postsRelations = relations(postsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [postsTable.user_id],
    references: [usersTable.id],
  }),
}));

export const creditPurchasesRelations = relations(creditPurchasesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [creditPurchasesTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;
export type Post = typeof postsTable.$inferSelect;
export type NewPost = typeof postsTable.$inferInsert;
export type CreditPurchase = typeof creditPurchasesTable.$inferSelect;
export type NewCreditPurchase = typeof creditPurchasesTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  posts: postsTable, 
  creditPurchases: creditPurchasesTable 
};