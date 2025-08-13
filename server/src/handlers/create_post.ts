import { db } from '../db';
import { usersTable, postsTable } from '../db/schema';
import { type CreatePostInput, type Post } from '../schema';
import { eq } from 'drizzle-orm';
import { promises as fs } from 'fs';
import { join } from 'path';

export async function createPost(input: CreatePostInput, userId: number): Promise<Post> {
  try {
    // 1. Check if user exists and get current credits and post count
    const users = await db.select({
      id: usersTable.id,
      credits: usersTable.credits
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .execute();

    if (users.length === 0) {
      throw new Error('User not found');
    }

    const user = users[0];
    
    // Count user's existing posts to determine if this is their first post
    const existingPosts = await db.select({ count: postsTable.id })
      .from(postsTable)
      .where(eq(postsTable.user_id, userId))
      .execute();

    const isFirstPost = existingPosts.length === 0;
    const creditsRequired = isFirstPost ? 0 : 5;

    // 2. Check if user has sufficient credits (first post is free)
    if (!isFirstPost && user.credits < creditsRequired) {
      throw new Error(`Insufficient credits. Required: ${creditsRequired}, Available: ${user.credits}`);
    }

    // 3. Save image data to server filesystem
    const uploadsDir = join(process.cwd(), 'uploads');
    
    // Ensure uploads directory exists
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename to avoid conflicts
    const timestamp = Date.now();
    const uniqueFilename = `${timestamp}-${input.image_filename}`;
    const imagePath = join(uploadsDir, uniqueFilename);
    
    // Decode base64 and save to file
    const imageBuffer = Buffer.from(input.image_data, 'base64');
    await fs.writeFile(imagePath, imageBuffer);

    // 4. Create post record with 24-hour expiration
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const result = await db.insert(postsTable)
      .values({
        user_id: userId,
        title: input.title,
        description: input.description,
        image_path: `/uploads/${uniqueFilename}`,
        expires_at: expiresAt
      })
      .returning()
      .execute();

    // 5. Deduct credits if needed (except for first post)
    if (!isFirstPost) {
      await db.update(usersTable)
        .set({
          credits: user.credits - creditsRequired,
          updated_at: new Date()
        })
        .where(eq(usersTable.id, userId))
        .execute();
    }

    // Return the created post
    return result[0];
  } catch (error) {
    console.error('Post creation failed:', error);
    throw error;
  }
}