import { db } from '../db';
import { postsTable } from '../db/schema';
import { type UpdatePostInput, type Post } from '../schema';
import { eq } from 'drizzle-orm';

export const updatePost = async (input: UpdatePostInput): Promise<Post> => {
  try {
    // Build the update object with only provided fields
    const updateData: any = {
      updated_at: new Date() // Always update the updated_at timestamp
    };

    // Only include fields that were provided in the input
    if (input.title !== undefined) {
      updateData.title = input.title;
    }
    
    if (input.content !== undefined) {
      updateData.content = input.content;
    }
    
    if (input.price !== undefined) {
      updateData.price = input.price.toString(); // Convert number to string for numeric column
    }

    // Update the post in the database
    const result = await db.update(postsTable)
      .set(updateData)
      .where(eq(postsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Post with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers and calculate is_active
    const post = result[0];
    const now = new Date();
    
    return {
      ...post,
      price: parseFloat(post.price), // Convert string back to number
      is_active: post.expires_at > now // Calculate if post is still active
    };
  } catch (error) {
    console.error('Post update failed:', error);
    throw error;
  }
};