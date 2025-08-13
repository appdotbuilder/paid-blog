import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { postsTable } from '../db/schema';
import { type CreatePostInput } from '../schema';
import { createPost } from '../handlers/create_post';
import { eq } from 'drizzle-orm';

// Test input with all required fields
const testInput: CreatePostInput = {
  title: 'Test Post Title',
  content: 'This is test content for our post.',
  price: 29.99
};

describe('createPost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a post with correct fields', async () => {
    const result = await createPost(testInput);

    // Basic field validation
    expect(result.title).toEqual('Test Post Title');
    expect(result.content).toEqual(testInput.content);
    expect(result.price).toEqual(29.99);
    expect(typeof result.price).toBe('number');
    expect(result.id).toBeDefined();
    expect(result.id).toBeGreaterThan(0);
  });

  it('should set timestamps correctly', async () => {
    const beforeCreate = new Date();
    const result = await createPost(testInput);
    const afterCreate = new Date();

    // Verify posted_at is set to current time
    expect(result.posted_at).toBeInstanceOf(Date);
    expect(result.posted_at.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
    expect(result.posted_at.getTime()).toBeLessThanOrEqual(afterCreate.getTime());

    // Verify expires_at is 24 hours after posted_at
    const expectedExpiresAt = new Date(result.posted_at.getTime() + 24 * 60 * 60 * 1000);
    expect(result.expires_at).toBeInstanceOf(Date);
    expect(result.expires_at.getTime()).toEqual(expectedExpiresAt.getTime());

    // Verify created_at and updated_at are set
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toEqual(result.posted_at.getTime());
    expect(result.updated_at.getTime()).toEqual(result.posted_at.getTime());
  });

  it('should set is_active to true for new posts', async () => {
    const result = await createPost(testInput);
    
    // New posts should be active since they just got posted
    expect(result.is_active).toBe(true);
  });

  it('should save post to database correctly', async () => {
    const result = await createPost(testInput);

    // Query the database to verify the post was saved
    const savedPosts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, result.id))
      .execute();

    expect(savedPosts).toHaveLength(1);
    const savedPost = savedPosts[0];
    
    expect(savedPost.title).toEqual('Test Post Title');
    expect(savedPost.content).toEqual(testInput.content);
    expect(parseFloat(savedPost.price)).toEqual(29.99); // Database stores as string
    expect(savedPost.posted_at).toBeInstanceOf(Date);
    expect(savedPost.expires_at).toBeInstanceOf(Date);
    expect(savedPost.created_at).toBeInstanceOf(Date);
    expect(savedPost.updated_at).toBeInstanceOf(Date);
  });

  it('should handle different price values correctly', async () => {
    const testCases = [
      { price: 0.01, description: 'minimum price' },
      { price: 99.99, description: 'two decimal places' },
      { price: 100, description: 'whole number' },
      { price: 1234.56, description: 'large price' }
    ];

    for (const testCase of testCases) {
      const input = { ...testInput, price: testCase.price };
      const result = await createPost(input);
      
      expect(result.price).toEqual(testCase.price);
      expect(typeof result.price).toBe('number');
      
      // Verify in database
      const savedPosts = await db.select()
        .from(postsTable)
        .where(eq(postsTable.id, result.id))
        .execute();
      
      expect(parseFloat(savedPosts[0].price)).toEqual(testCase.price);
    }
  });

  it('should create multiple posts with unique IDs', async () => {
    const input1 = { ...testInput, title: 'First Post' };
    const input2 = { ...testInput, title: 'Second Post' };
    
    const result1 = await createPost(input1);
    const result2 = await createPost(input2);
    
    expect(result1.id).not.toEqual(result2.id);
    expect(result1.title).toEqual('First Post');
    expect(result2.title).toEqual('Second Post');
    
    // Verify both exist in database
    const allPosts = await db.select().from(postsTable).execute();
    expect(allPosts).toHaveLength(2);
  });

  it('should handle long content correctly', async () => {
    const longContent = 'A'.repeat(1000); // Long string
    const input = { ...testInput, content: longContent };
    
    const result = await createPost(input);
    
    expect(result.content).toEqual(longContent);
    expect(result.content.length).toEqual(1000);
    
    // Verify in database
    const savedPosts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, result.id))
      .execute();
    
    expect(savedPosts[0].content).toEqual(longContent);
  });
});