import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { postsTable } from '../db/schema';
import { type RepostInput } from '../schema';
import { repost } from '../handlers/repost';
import { eq } from 'drizzle-orm';

describe('repost', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should repost an expired post with new timestamps', async () => {
    // Create an expired post first
    const pastDate = new Date('2024-01-01T10:00:00Z');
    const expiredDate = new Date('2024-01-01T11:00:00Z'); // 1 hour later, already expired

    const [createdPost] = await db.insert(postsTable)
      .values({
        title: 'Expired Post',
        content: 'This post has expired',
        price: '29.99',
        posted_at: pastDate,
        expires_at: expiredDate,
        created_at: pastDate,
        updated_at: pastDate
      })
      .returning()
      .execute();

    const input: RepostInput = {
      id: createdPost.id
    };

    const beforeRepost = new Date();
    const result = await repost(input);
    const afterRepost = new Date();

    // Verify basic fields are preserved
    expect(result.id).toEqual(createdPost.id);
    expect(result.title).toEqual('Expired Post');
    expect(result.content).toEqual('This post has expired');
    expect(result.price).toEqual(29.99);
    expect(typeof result.price).toBe('number');

    // Verify timestamps are updated
    expect(result.posted_at).toBeInstanceOf(Date);
    expect(result.expires_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify posted_at is updated to current time (within test execution window)
    expect(result.posted_at.getTime()).toBeGreaterThanOrEqual(beforeRepost.getTime());
    expect(result.posted_at.getTime()).toBeLessThanOrEqual(afterRepost.getTime());

    // Verify expires_at is 24 hours after posted_at
    const expectedExpiry = new Date(result.posted_at.getTime() + 24 * 60 * 60 * 1000);
    expect(Math.abs(result.expires_at.getTime() - expectedExpiry.getTime())).toBeLessThan(1000); // Within 1 second

    // Verify created_at is preserved (unchanged from original)
    expect(result.created_at).toEqual(pastDate);

    // Verify post is now active
    expect(result.is_active).toBe(true);
  });

  it('should update the database with new timestamps', async () => {
    // Create a post first
    const originalDate = new Date('2024-01-01T10:00:00Z');
    const [createdPost] = await db.insert(postsTable)
      .values({
        title: 'Test Repost',
        content: 'Testing repost functionality',
        price: '15.50',
        posted_at: originalDate,
        expires_at: new Date('2024-01-01T11:00:00Z'),
        created_at: originalDate,
        updated_at: originalDate
      })
      .returning()
      .execute();

    const input: RepostInput = {
      id: createdPost.id
    };

    await repost(input);

    // Verify database was updated
    const updatedPosts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, createdPost.id))
      .execute();

    expect(updatedPosts).toHaveLength(1);
    const updatedPost = updatedPosts[0];

    // Verify database timestamps were updated
    expect(updatedPost.posted_at).toBeInstanceOf(Date);
    expect(updatedPost.expires_at).toBeInstanceOf(Date);
    expect(updatedPost.updated_at).toBeInstanceOf(Date);

    // Verify posted_at and updated_at are recent
    const now = new Date();
    expect(updatedPost.posted_at.getTime()).toBeGreaterThan(originalDate.getTime());
    expect(updatedPost.updated_at.getTime()).toBeGreaterThan(originalDate.getTime());

    // Verify expires_at is 24 hours after posted_at
    const expectedExpiry = new Date(updatedPost.posted_at.getTime() + 24 * 60 * 60 * 1000);
    expect(Math.abs(updatedPost.expires_at.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);

    // Verify created_at is preserved
    expect(updatedPost.created_at).toEqual(originalDate);

    // Verify other fields are unchanged
    expect(updatedPost.title).toEqual('Test Repost');
    expect(updatedPost.content).toEqual('Testing repost functionality');
    expect(parseFloat(updatedPost.price)).toEqual(15.50);
  });

  it('should work with active posts too', async () => {
    // Create an active post (not expired)
    const recentDate = new Date();
    const futureExpiry = new Date(recentDate.getTime() + 12 * 60 * 60 * 1000); // 12 hours from now

    const [createdPost] = await db.insert(postsTable)
      .values({
        title: 'Active Post',
        content: 'This post is still active',
        price: '99.99',
        posted_at: recentDate,
        expires_at: futureExpiry,
        created_at: recentDate,
        updated_at: recentDate
      })
      .returning()
      .execute();

    const input: RepostInput = {
      id: createdPost.id
    };

    const result = await repost(input);

    // Should still work and reset the expiry time
    expect(result.id).toEqual(createdPost.id);
    expect(result.is_active).toBe(true);
    expect(result.posted_at.getTime()).toBeGreaterThan(recentDate.getTime());

    // New expiry should be 24 hours from the new posted_at time
    const expectedExpiry = new Date(result.posted_at.getTime() + 24 * 60 * 60 * 1000);
    expect(Math.abs(result.expires_at.getTime() - expectedExpiry.getTime())).toBeLessThan(1000);
  });

  it('should throw error for non-existent post', async () => {
    const input: RepostInput = {
      id: 99999 // Non-existent ID
    };

    await expect(repost(input)).rejects.toThrow(/Post with id 99999 not found/i);
  });

  it('should preserve all original post data except timestamps', async () => {
    // Create a post with specific data
    const originalDate = new Date('2024-01-01T10:00:00Z');
    const [createdPost] = await db.insert(postsTable)
      .values({
        title: 'Detailed Post Title',
        content: 'Very detailed content with special characters: !@#$%^&*()',
        price: '123.45',
        posted_at: originalDate,
        expires_at: new Date('2024-01-01T11:00:00Z'),
        created_at: originalDate,
        updated_at: originalDate
      })
      .returning()
      .execute();

    const input: RepostInput = {
      id: createdPost.id
    };

    const result = await repost(input);

    // Verify all content is preserved exactly
    expect(result.title).toEqual('Detailed Post Title');
    expect(result.content).toEqual('Very detailed content with special characters: !@#$%^&*()');
    expect(result.price).toEqual(123.45);
    expect(result.created_at).toEqual(originalDate);

    // Verify only the repost-specific timestamps changed
    expect(result.posted_at).not.toEqual(originalDate);
    expect(result.expires_at).not.toEqual(new Date('2024-01-01T11:00:00Z'));
    expect(result.updated_at).not.toEqual(originalDate);
  });
});