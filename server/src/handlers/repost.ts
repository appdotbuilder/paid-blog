import { db } from '../db';
import { postsTable } from '../db/schema';
import { type RepostInput, type Post } from '../schema';
import { eq } from 'drizzle-orm';

export const repost = async (input: RepostInput): Promise<Post> => {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    // Update the post's posted_at, expires_at, and updated_at timestamps
    const result = await db.update(postsTable)
      .set({
        posted_at: now,
        expires_at: expiresAt,
        updated_at: now
      })
      .where(eq(postsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Post with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const post = result[0];
    return {
      ...post,
      price: parseFloat(post.price), // Convert string back to number
      is_active: post.expires_at > new Date() // Compute active status based on expiry
    };
  } catch (error) {
    console.error('Repost failed:', error);
    throw error;
  }
};