import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string(),
  password_hash: z.string(),
  phone_number: z.string(),
  credits: z.number().int().nonnegative(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// User registration input schema
export const registerUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  phone_number: z.string()
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;

// User login input schema
export const loginUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

export type LoginUserInput = z.infer<typeof loginUserInputSchema>;

// Post schema
export const postSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  title: z.string(),
  description: z.string(),
  image_path: z.string(),
  expires_at: z.coerce.date(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Post = z.infer<typeof postSchema>;

// Create post input schema
export const createPostInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  image_data: z.string(), // Base64 encoded image data
  image_filename: z.string()
});

export type CreatePostInput = z.infer<typeof createPostInputSchema>;

// Credit purchase schema
export const creditPurchaseSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  credits_purchased: z.number().int().positive(),
  amount_paid: z.number().positive(),
  payment_method: z.enum(['credit_card', 'paypal', 'bank_transfer']),
  transaction_id: z.string(),
  created_at: z.coerce.date()
});

export type CreditPurchase = z.infer<typeof creditPurchaseSchema>;

// Purchase credits input schema
export const purchaseCreditsInputSchema = z.object({
  credits: z.number().int().positive(),
  payment_method: z.enum(['credit_card', 'paypal', 'bank_transfer']),
  payment_details: z.object({
    card_number: z.string().optional(),
    paypal_email: z.string().email().optional(),
    bank_account: z.string().optional()
  }).optional()
});

export type PurchaseCreditsInput = z.infer<typeof purchaseCreditsInputSchema>;

// Auth context schema for authenticated requests
export const authContextSchema = z.object({
  user_id: z.number(),
  email: z.string()
});

export type AuthContext = z.infer<typeof authContextSchema>;

// Public post schema (without sensitive user data)
export const publicPostSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  image_path: z.string(),
  phone_number: z.string(),
  created_at: z.coerce.date(),
  expires_at: z.coerce.date()
});

export type PublicPost = z.infer<typeof publicPostSchema>;