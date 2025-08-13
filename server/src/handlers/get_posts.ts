import { db } from '../db';
import { postsTable } from '../db/schema';
import { type Post } from '../schema';
import { desc } from 'drizzle-orm';

export async function getPosts(): Promise<Post[]> {
  try {
    // Query all posts ordered by posted_at descending
    const results = await db.select()
      .from(postsTable)
      .orderBy(desc(postsTable.posted_at))
      .execute();

    const currentTime = new Date();

    // Convert numeric fields and calculate is_active status
    return results.map(post => ({
      ...post,
      price: parseFloat(post.price), // Convert numeric string to number
      is_active: currentTime < post.expires_at // Calculate active status based on expiration
    }));
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    throw error;
  }
}