import { db } from '../db';
import { postsTable } from '../db/schema';
import { type Post } from '../schema';
import { eq, desc } from 'drizzle-orm';

export const getUserPosts = async (userId: number): Promise<Post[]> => {
  try {
    const results = await db.select()
      .from(postsTable)
      .where(eq(postsTable.user_id, userId))
      .orderBy(desc(postsTable.created_at))
      .execute();

    // Return posts with proper field mapping - no numeric conversions needed for this schema
    return results.map(post => ({
      id: post.id,
      user_id: post.user_id,
      title: post.title,
      description: post.description,
      image_path: post.image_path,
      expires_at: post.expires_at,
      created_at: post.created_at,
      updated_at: post.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch user posts:', error);
    throw error;
  }
};