import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable } from '../db/schema';
import { getUserPosts } from '../handlers/get_user_posts';
import { eq } from 'drizzle-orm';

describe('getUserPosts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no posts', async () => {
    // Create a user first
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        phone_number: '1234567890'
      })
      .returning()
      .execute();

    const userId = users[0].id;
    const result = await getUserPosts(userId);

    expect(result).toHaveLength(0);
  });

  it('should return posts for a specific user ordered by creation date (newest first)', async () => {
    // Create a user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        phone_number: '1234567890'
      })
      .returning()
      .execute();

    const userId = users[0].id;

    // Create multiple posts with different timestamps
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await db.insert(postsTable)
      .values([
        {
          user_id: userId,
          title: 'First Post',
          description: 'Description 1',
          image_path: '/images/first.jpg',
          expires_at: tomorrow,
          created_at: twoHoursAgo
        },
        {
          user_id: userId,
          title: 'Second Post',
          description: 'Description 2',
          image_path: '/images/second.jpg',
          expires_at: tomorrow,
          created_at: oneHourAgo
        },
        {
          user_id: userId,
          title: 'Third Post',
          description: 'Description 3',
          image_path: '/images/third.jpg',
          expires_at: tomorrow,
          created_at: now
        }
      ])
      .execute();

    const result = await getUserPosts(userId);

    // Should return 3 posts
    expect(result).toHaveLength(3);

    // Should be ordered by creation date (newest first)
    expect(result[0].title).toEqual('Third Post');
    expect(result[1].title).toEqual('Second Post');
    expect(result[2].title).toEqual('First Post');

    // Verify all fields are present and correct
    expect(result[0].user_id).toEqual(userId);
    expect(result[0].description).toEqual('Description 3');
    expect(result[0].image_path).toEqual('/images/third.jpg');
    expect(result[0].expires_at).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
    expect(result[0].id).toBeDefined();
  });

  it('should include expired posts', async () => {
    // Create a user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        phone_number: '1234567890'
      })
      .returning()
      .execute();

    const userId = users[0].id;

    // Create a post that has already expired
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    await db.insert(postsTable)
      .values({
        user_id: userId,
        title: 'Expired Post',
        description: 'This post has expired',
        image_path: '/images/expired.jpg',
        expires_at: yesterday,
        created_at: twoDaysAgo
      })
      .execute();

    const result = await getUserPosts(userId);

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Expired Post');
    expect(result[0].expires_at).toEqual(yesterday);
  });

  it('should only return posts for the specified user', async () => {
    // Create two users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          password_hash: 'hashedpassword1',
          phone_number: '1234567890'
        },
        {
          email: 'user2@example.com',
          password_hash: 'hashedpassword2',
          phone_number: '0987654321'
        }
      ])
      .returning()
      .execute();

    const user1Id = users[0].id;
    const user2Id = users[1].id;

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create posts for both users
    await db.insert(postsTable)
      .values([
        {
          user_id: user1Id,
          title: 'User 1 Post',
          description: 'Post by user 1',
          image_path: '/images/user1.jpg',
          expires_at: tomorrow
        },
        {
          user_id: user2Id,
          title: 'User 2 Post',
          description: 'Post by user 2',
          image_path: '/images/user2.jpg',
          expires_at: tomorrow
        }
      ])
      .execute();

    const user1Posts = await getUserPosts(user1Id);
    const user2Posts = await getUserPosts(user2Id);

    // Each user should only see their own posts
    expect(user1Posts).toHaveLength(1);
    expect(user1Posts[0].title).toEqual('User 1 Post');
    expect(user1Posts[0].user_id).toEqual(user1Id);

    expect(user2Posts).toHaveLength(1);
    expect(user2Posts[0].title).toEqual('User 2 Post');
    expect(user2Posts[0].user_id).toEqual(user2Id);
  });

  it('should handle non-existent user gracefully', async () => {
    const nonExistentUserId = 999999;
    const result = await getUserPosts(nonExistentUserId);

    expect(result).toHaveLength(0);
  });

  it('should verify posts are saved correctly in database', async () => {
    // Create a user
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        phone_number: '1234567890'
      })
      .returning()
      .execute();

    const userId = users[0].id;
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create a post
    await db.insert(postsTable)
      .values({
        user_id: userId,
        title: 'Database Test Post',
        description: 'Testing database storage',
        image_path: '/images/dbtest.jpg',
        expires_at: tomorrow
      })
      .execute();

    // Fetch using handler
    const handlerResult = await getUserPosts(userId);

    // Verify directly in database
    const dbPosts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.user_id, userId))
      .execute();

    expect(handlerResult).toHaveLength(1);
    expect(dbPosts).toHaveLength(1);
    expect(handlerResult[0].title).toEqual(dbPosts[0].title);
    expect(handlerResult[0].description).toEqual(dbPosts[0].description);
    expect(handlerResult[0].image_path).toEqual(dbPosts[0].image_path);
  });
});