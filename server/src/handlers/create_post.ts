import { db } from '../db';
import { postsTable } from '../db/schema';
import { type CreatePostInput, type Post } from '../schema';

export const createPost = async (input: CreatePostInput): Promise<Post> => {
  try {
    // Calculate timestamps
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
    
    // Insert post record
    const result = await db.insert(postsTable)
      .values({
        title: input.title,
        content: input.content,
        price: input.price.toString(), // Convert number to string for numeric column
        posted_at: now,
        expires_at: expiresAt,
        created_at: now,
        updated_at: now
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers and add computed field
    const post = result[0];
    const currentTime = new Date();
    
    return {
      ...post,
      price: parseFloat(post.price), // Convert string back to number
      is_active: currentTime < post.expires_at // Computed field: active if not expired
    };
  } catch (error) {
    console.error('Post creation failed:', error);
    throw error;
  }
};