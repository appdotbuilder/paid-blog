import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { postsTable } from '../db/schema';
import { type DeletePostInput } from '../schema';
import { deletePost } from '../handlers/delete_post';
import { eq } from 'drizzle-orm';

// Test input for deletion
const testDeleteInput: DeletePostInput = {
  id: 1
};

describe('deletePost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing post successfully', async () => {
    // First create a post to delete
    const testPost = {
      title: 'Test Post',
      content: 'Content to be deleted',
      price: '29.99',
      posted_at: new Date(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    };

    const insertedPost = await db.insert(postsTable)
      .values(testPost)
      .returning()
      .execute();

    const postId = insertedPost[0].id;

    // Delete the post
    const result = await deletePost({ id: postId });

    // Verify the response
    expect(result.success).toBe(true);
    expect(result.id).toBe(postId);

    // Verify the post was actually deleted from the database
    const deletedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .execute();

    expect(deletedPost).toHaveLength(0);
  });

  it('should throw error when trying to delete non-existent post', async () => {
    const nonExistentId = 9999;

    // Attempt to delete non-existent post
    await expect(deletePost({ id: nonExistentId }))
      .rejects.toThrow(/Post with id 9999 not found/i);
  });

  it('should verify post exists before deletion', async () => {
    // Create two posts
    const post1 = {
      title: 'Post 1',
      content: 'First post content',
      price: '19.99',
      posted_at: new Date(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const post2 = {
      title: 'Post 2',
      content: 'Second post content',
      price: '39.99',
      posted_at: new Date(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const [insertedPost1, insertedPost2] = await Promise.all([
      db.insert(postsTable).values(post1).returning().execute(),
      db.insert(postsTable).values(post2).returning().execute()
    ]);

    const post1Id = insertedPost1[0].id;
    const post2Id = insertedPost2[0].id;

    // Delete only post1
    const result = await deletePost({ id: post1Id });

    expect(result.success).toBe(true);
    expect(result.id).toBe(post1Id);

    // Verify post1 is deleted but post2 still exists
    const remainingPosts = await db.select()
      .from(postsTable)
      .execute();

    expect(remainingPosts).toHaveLength(1);
    expect(remainingPosts[0].id).toBe(post2Id);
    expect(remainingPosts[0].title).toBe('Post 2');
  });

  it('should handle deletion with different post data types', async () => {
    // Create a post with various data types
    const complexPost = {
      title: 'Complex Post Title with Special Characters: !@#$%',
      content: 'Multi-line content\nwith special characters: áéíóú\nand numbers: 12345',
      price: '123.45',
      posted_at: new Date('2024-01-15T10:30:00Z'),
      expires_at: new Date('2024-01-16T10:30:00Z'),
    };

    const insertedPost = await db.insert(postsTable)
      .values(complexPost)
      .returning()
      .execute();

    const postId = insertedPost[0].id;

    // Delete the complex post
    const result = await deletePost({ id: postId });

    expect(result.success).toBe(true);
    expect(result.id).toBe(postId);

    // Verify deletion
    const deletedPost = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .execute();

    expect(deletedPost).toHaveLength(0);
  });

  it('should handle concurrent deletion attempts gracefully', async () => {
    // Create a post
    const testPost = {
      title: 'Concurrent Delete Test',
      content: 'Testing concurrent deletion',
      price: '15.99',
      posted_at: new Date(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };

    const insertedPost = await db.insert(postsTable)
      .values(testPost)
      .returning()
      .execute();

    const postId = insertedPost[0].id;

    // First deletion should succeed
    const result1 = await deletePost({ id: postId });
    expect(result1.success).toBe(true);

    // Second deletion should fail since post no longer exists
    await expect(deletePost({ id: postId }))
      .rejects.toThrow(/Post with id \d+ not found/i);
  });
});