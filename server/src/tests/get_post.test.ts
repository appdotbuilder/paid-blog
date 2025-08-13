import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { postsTable } from '../db/schema';
import { type GetPostInput } from '../schema';
import { getPost } from '../handlers/get_post';

describe('getPost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return a post when it exists', async () => {
    // Create a test post first
    const currentTime = new Date();
    const expiryTime = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours later

    const insertResult = await db.insert(postsTable)
      .values({
        title: 'Test Post',
        content: 'This is test content',
        price: '19.99', // Insert as string for numeric column
        posted_at: currentTime,
        expires_at: expiryTime
      })
      .returning()
      .execute();

    const insertedPost = insertResult[0];
    const input: GetPostInput = { id: insertedPost.id };

    // Test the handler
    const result = await getPost(input);

    expect(result).toBeDefined();
    expect(result!.id).toEqual(insertedPost.id);
    expect(result!.title).toEqual('Test Post');
    expect(result!.content).toEqual('This is test content');
    expect(result!.price).toEqual(19.99); // Should be converted to number
    expect(typeof result!.price).toEqual('number'); // Verify numeric conversion
    expect(result!.posted_at).toBeInstanceOf(Date);
    expect(result!.expires_at).toBeInstanceOf(Date);
    expect(result!.is_active).toEqual(true); // Should be active since expiry is in future
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when post does not exist', async () => {
    const input: GetPostInput = { id: 999 }; // Non-existent ID

    const result = await getPost(input);

    expect(result).toBeNull();
  });

  it('should correctly calculate is_active as true for active posts', async () => {
    // Create a post that expires in the future
    const currentTime = new Date();
    const expiryTime = new Date(currentTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

    const insertResult = await db.insert(postsTable)
      .values({
        title: 'Active Post',
        content: 'Content for active post',
        price: '25.50',
        posted_at: currentTime,
        expires_at: expiryTime
      })
      .returning()
      .execute();

    const input: GetPostInput = { id: insertResult[0].id };
    const result = await getPost(input);

    expect(result).toBeDefined();
    expect(result!.is_active).toEqual(true);
  });

  it('should correctly calculate is_active as false for expired posts', async () => {
    // Create a post that has already expired
    const currentTime = new Date();
    const pastTime = new Date(currentTime.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    const expiryTime = new Date(currentTime.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago

    const insertResult = await db.insert(postsTable)
      .values({
        title: 'Expired Post',
        content: 'Content for expired post',
        price: '15.75',
        posted_at: pastTime,
        expires_at: expiryTime
      })
      .returning()
      .execute();

    const input: GetPostInput = { id: insertResult[0].id };
    const result = await getPost(input);

    expect(result).toBeDefined();
    expect(result!.is_active).toEqual(false);
  });

  it('should handle edge case when post expires exactly now', async () => {
    // Create a post that expires slightly in the future to account for execution time
    const currentTime = new Date();
    const pastTime = new Date(currentTime.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago
    const nearFutureTime = new Date(currentTime.getTime() + 100); // 100ms in future

    const insertResult = await db.insert(postsTable)
      .values({
        title: 'Edge Case Post',
        content: 'Content for edge case',
        price: '30.00',
        posted_at: pastTime,
        expires_at: nearFutureTime // Expires just slightly in the future
      })
      .returning()
      .execute();

    const input: GetPostInput = { id: insertResult[0].id };
    const result = await getPost(input);

    expect(result).toBeDefined();
    // Should be true since expiry is slightly in the future
    expect(result!.is_active).toEqual(true);
  });

  it('should handle different price formats correctly', async () => {
    // Test with numeric price formats - PostgreSQL numeric(10,2) stores only 2 decimal places
    const currentTime = new Date();
    const expiryTime = new Date(currentTime.getTime() + 24 * 60 * 60 * 1000);

    const insertResult = await db.insert(postsTable)
      .values({
        title: 'Price Test Post',
        content: 'Testing price conversion',
        price: '123.46', // Exactly 2 decimal places to match DB schema
        posted_at: currentTime,
        expires_at: expiryTime
      })
      .returning()
      .execute();

    const input: GetPostInput = { id: insertResult[0].id };
    const result = await getPost(input);

    expect(result).toBeDefined();
    expect(typeof result!.price).toEqual('number');
    expect(result!.price).toEqual(123.46); // Should match the 2 decimal precision
  });
});