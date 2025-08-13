import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { postsTable } from '../db/schema';
import { type UpdatePostInput } from '../schema';
import { updatePost } from '../handlers/update_post';
import { eq } from 'drizzle-orm';

// Helper function to create a test post
const createTestPost = async () => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

  const result = await db.insert(postsTable)
    .values({
      title: 'Original Title',
      content: 'Original content for testing',
      price: '29.99',
      posted_at: now,
      expires_at: expiresAt,
      created_at: now,
      updated_at: now
    })
    .returning()
    .execute();

  return result[0];
};

describe('updatePost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update post title only', async () => {
    const testPost = await createTestPost();
    const originalUpdatedAt = testPost.updated_at;
    
    // Wait a small amount to ensure updated_at changes
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdatePostInput = {
      id: testPost.id,
      title: 'Updated Title'
    };

    const result = await updatePost(updateInput);

    // Verify the response
    expect(result.id).toEqual(testPost.id);
    expect(result.title).toEqual('Updated Title');
    expect(result.content).toEqual('Original content for testing'); // Unchanged
    expect(result.price).toEqual(29.99); // Unchanged
    expect(typeof result.price).toEqual('number');
    expect(result.posted_at).toEqual(testPost.posted_at); // Unchanged
    expect(result.expires_at).toEqual(testPost.expires_at); // Unchanged
    expect(result.created_at).toEqual(testPost.created_at); // Unchanged
    expect(result.updated_at).not.toEqual(originalUpdatedAt); // Changed
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.is_active).toBe(true);
  });

  it('should update post content only', async () => {
    const testPost = await createTestPost();
    
    const updateInput: UpdatePostInput = {
      id: testPost.id,
      content: 'Updated content with new information'
    };

    const result = await updatePost(updateInput);

    expect(result.id).toEqual(testPost.id);
    expect(result.title).toEqual('Original Title'); // Unchanged
    expect(result.content).toEqual('Updated content with new information');
    expect(result.price).toEqual(29.99); // Unchanged
  });

  it('should update post price only', async () => {
    const testPost = await createTestPost();
    
    const updateInput: UpdatePostInput = {
      id: testPost.id,
      price: 49.95
    };

    const result = await updatePost(updateInput);

    expect(result.id).toEqual(testPost.id);
    expect(result.title).toEqual('Original Title'); // Unchanged
    expect(result.content).toEqual('Original content for testing'); // Unchanged
    expect(result.price).toEqual(49.95);
    expect(typeof result.price).toEqual('number');
  });

  it('should update multiple fields at once', async () => {
    const testPost = await createTestPost();
    
    const updateInput: UpdatePostInput = {
      id: testPost.id,
      title: 'New Title',
      content: 'New content',
      price: 15.50
    };

    const result = await updatePost(updateInput);

    expect(result.id).toEqual(testPost.id);
    expect(result.title).toEqual('New Title');
    expect(result.content).toEqual('New content');
    expect(result.price).toEqual(15.50);
    expect(typeof result.price).toEqual('number');
    expect(result.posted_at).toEqual(testPost.posted_at); // Unchanged
    expect(result.expires_at).toEqual(testPost.expires_at); // Unchanged
    expect(result.created_at).toEqual(testPost.created_at); // Unchanged
  });

  it('should persist changes to database', async () => {
    const testPost = await createTestPost();
    
    const updateInput: UpdatePostInput = {
      id: testPost.id,
      title: 'Database Test Title',
      price: 99.99
    };

    await updatePost(updateInput);

    // Query the database directly to verify persistence
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, testPost.id))
      .execute();

    expect(posts).toHaveLength(1);
    const dbPost = posts[0];
    expect(dbPost.title).toEqual('Database Test Title');
    expect(parseFloat(dbPost.price)).toEqual(99.99);
    expect(dbPost.content).toEqual('Original content for testing'); // Unchanged
    expect(dbPost.updated_at).not.toEqual(testPost.updated_at);
  });

  it('should calculate is_active correctly for active post', async () => {
    // Create a post that expires in the future
    const now = new Date();
    const futureExpiry = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

    const result = await db.insert(postsTable)
      .values({
        title: 'Active Post',
        content: 'This post is still active',
        price: '10.00',
        posted_at: now,
        expires_at: futureExpiry,
        created_at: now,
        updated_at: now
      })
      .returning()
      .execute();

    const testPost = result[0];

    const updateInput: UpdatePostInput = {
      id: testPost.id,
      title: 'Updated Active Post'
    };

    const updatedPost = await updatePost(updateInput);
    expect(updatedPost.is_active).toBe(true);
  });

  it('should calculate is_active correctly for expired post', async () => {
    // Create a post that has already expired
    const now = new Date();
    const pastExpiry = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

    const result = await db.insert(postsTable)
      .values({
        title: 'Expired Post',
        content: 'This post has expired',
        price: '10.00',
        posted_at: new Date(now.getTime() - 25 * 60 * 60 * 1000), // 25 hours ago
        expires_at: pastExpiry,
        created_at: now,
        updated_at: now
      })
      .returning()
      .execute();

    const testPost = result[0];

    const updateInput: UpdatePostInput = {
      id: testPost.id,
      title: 'Updated Expired Post'
    };

    const updatedPost = await updatePost(updateInput);
    expect(updatedPost.is_active).toBe(false);
  });

  it('should throw error when post does not exist', async () => {
    const updateInput: UpdatePostInput = {
      id: 99999, // Non-existent post ID
      title: 'This should fail'
    };

    await expect(updatePost(updateInput)).rejects.toThrow(/Post with id 99999 not found/i);
  });

  it('should preserve original timestamps when updating', async () => {
    const testPost = await createTestPost();
    
    const updateInput: UpdatePostInput = {
      id: testPost.id,
      title: 'Timestamp Test'
    };

    const result = await updatePost(updateInput);

    // These timestamps should remain unchanged
    expect(result.posted_at).toEqual(testPost.posted_at);
    expect(result.expires_at).toEqual(testPost.expires_at);
    expect(result.created_at).toEqual(testPost.created_at);
    
    // Only updated_at should change
    expect(result.updated_at).not.toEqual(testPost.updated_at);
    expect(result.updated_at).toBeInstanceOf(Date);
  });
});