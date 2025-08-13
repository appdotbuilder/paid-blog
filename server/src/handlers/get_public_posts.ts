import { db } from '../db';
import { postsTable, usersTable } from '../db/schema';
import { type PublicPost } from '../schema';
import { gt, desc, eq } from 'drizzle-orm';

export const getPublicPosts = async (): Promise<PublicPost[]> => {
  try {
    const now = new Date();
    
    // Query posts that haven't expired, joining with users to get phone numbers
    const results = await db.select({
      id: postsTable.id,
      title: postsTable.title,
      description: postsTable.description,
      image_path: postsTable.image_path,
      phone_number: usersTable.phone_number,
      created_at: postsTable.created_at,
      expires_at: postsTable.expires_at
    })
      .from(postsTable)
      .innerJoin(usersTable, eq(postsTable.user_id, usersTable.id))
      .where(gt(postsTable.expires_at, now))
      .orderBy(desc(postsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch public posts:', error);
    throw error;
  }
};