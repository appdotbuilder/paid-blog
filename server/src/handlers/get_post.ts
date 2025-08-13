import { db } from '../db';
import { postsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type GetPostInput, type Post } from '../schema';

export async function getPost(input: GetPostInput): Promise<Post | null> {
  try {
    // Query the database for the specific post
    const results = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, input.id))
      .execute();

    // Return null if post not found
    if (results.length === 0) {
      return null;
    }

    const post = results[0];
    const currentTime = new Date();

    // Convert numeric fields and calculate is_active status
    return {
      ...post,
      price: parseFloat(post.price), // Convert string back to number for numeric column
      is_active: currentTime <= post.expires_at // Post is active if current time is before expiry
    };
  } catch (error) {
    console.error('Get post failed:', error);
    throw error;
  }
}