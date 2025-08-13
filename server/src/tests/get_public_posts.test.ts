import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable } from '../db/schema';
import { getPublicPosts } from '../handlers/get_public_posts';

describe('getPublicPosts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return only non-expired posts', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@test.com',
          password_hash: 'hash1',
          phone_number: '+1234567890',
          credits: 1
        },
        {
          email: 'user2@test.com',
          password_hash: 'hash2',
          phone_number: '+9876543210',
          credits: 1
        }
      ])
      .returning()
      .execute();

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Create posts - one active, one expired
    await db.insert(postsTable)
      .values([
        {
          user_id: users[0].id,
          title: 'Active Post',
          description: 'This post is still active',
          image_path: '/images/active.jpg',
          expires_at: tomorrow
        },
        {
          user_id: users[1].id,
          title: 'Expired Post',
          description: 'This post has expired',
          image_path: '/images/expired.jpg',
          expires_at: yesterday
        }
      ])
      .execute();

    const result = await getPublicPosts();

    // Should only return the active post
    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('Active Post');
    expect(result[0].phone_number).toEqual('+1234567890');
    expect(result[0].expires_at).toBeInstanceOf(Date);
    expect(result[0].expires_at > now).toBe(true);
  });

  it('should return posts ordered by creation date (newest first)', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        password_hash: 'hash',
        phone_number: '+1234567890',
        credits: 3
      })
      .returning()
      .execute();

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    // Create posts with different creation times
    await db.insert(postsTable)
      .values([
        {
          user_id: user[0].id,
          title: 'Oldest Post',
          description: 'Created 2 hours ago',
          image_path: '/images/old.jpg',
          expires_at: tomorrow,
          created_at: twoHoursAgo
        },
        {
          user_id: user[0].id,
          title: 'Newest Post',
          description: 'Created now',
          image_path: '/images/new.jpg',
          expires_at: tomorrow,
          created_at: now
        },
        {
          user_id: user[0].id,
          title: 'Middle Post',
          description: 'Created 1 hour ago',
          image_path: '/images/middle.jpg',
          expires_at: tomorrow,
          created_at: oneHourAgo
        }
      ])
      .execute();

    const result = await getPublicPosts();

    expect(result).toHaveLength(3);
    expect(result[0].title).toEqual('Newest Post');
    expect(result[1].title).toEqual('Middle Post');
    expect(result[2].title).toEqual('Oldest Post');

    // Verify ordering by checking creation timestamps
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[1].created_at >= result[2].created_at).toBe(true);
  });

  it('should include correct user phone number for each post', async () => {
    // Create multiple users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'john@test.com',
          password_hash: 'hash1',
          phone_number: '+1111111111',
          credits: 1
        },
        {
          email: 'jane@test.com',
          password_hash: 'hash2',
          phone_number: '+2222222222',
          credits: 1
        }
      ])
      .returning()
      .execute();

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create posts for different users
    await db.insert(postsTable)
      .values([
        {
          user_id: users[0].id,
          title: "John's Post",
          description: 'Posted by John',
          image_path: '/images/john.jpg',
          expires_at: tomorrow
        },
        {
          user_id: users[1].id,
          title: "Jane's Post",
          description: 'Posted by Jane',
          image_path: '/images/jane.jpg',
          expires_at: tomorrow
        }
      ])
      .execute();

    const result = await getPublicPosts();

    expect(result).toHaveLength(2);

    // Find John's and Jane's posts
    const johnPost = result.find(post => post.title === "John's Post");
    const janePost = result.find(post => post.title === "Jane's Post");

    expect(johnPost).toBeDefined();
    expect(janePost).toBeDefined();
    expect(johnPost!.phone_number).toEqual('+1111111111');
    expect(janePost!.phone_number).toEqual('+2222222222');
  });

  it('should return empty array when no active posts exist', async () => {
    // Create user but no posts
    await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        password_hash: 'hash',
        phone_number: '+1234567890',
        credits: 1
      })
      .execute();

    const result = await getPublicPosts();

    expect(result).toHaveLength(0);
  });

  it('should return empty array when all posts are expired', async () => {
    // Create user
    const user = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        password_hash: 'hash',
        phone_number: '+1234567890',
        credits: 1
      })
      .returning()
      .execute();

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Create expired post
    await db.insert(postsTable)
      .values({
        user_id: user[0].id,
        title: 'Expired Post',
        description: 'This expired yesterday',
        image_path: '/images/expired.jpg',
        expires_at: yesterday
      })
      .execute();

    const result = await getPublicPosts();

    expect(result).toHaveLength(0);
  });

  it('should return all required PublicPost fields', async () => {
    // Create test user and post
    const user = await db.insert(usersTable)
      .values({
        email: 'user@test.com',
        password_hash: 'hash',
        phone_number: '+1234567890',
        credits: 1
      })
      .returning()
      .execute();

    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db.insert(postsTable)
      .values({
        user_id: user[0].id,
        title: 'Test Post',
        description: 'Test description',
        image_path: '/images/test.jpg',
        expires_at: tomorrow
      })
      .execute();

    const result = await getPublicPosts();

    expect(result).toHaveLength(1);
    const post = result[0];

    // Verify all PublicPost fields are present
    expect(post.id).toBeDefined();
    expect(typeof post.id).toBe('number');
    expect(post.title).toEqual('Test Post');
    expect(post.description).toEqual('Test description');
    expect(post.image_path).toEqual('/images/test.jpg');
    expect(post.phone_number).toEqual('+1234567890');
    expect(post.created_at).toBeInstanceOf(Date);
    expect(post.expires_at).toBeInstanceOf(Date);

    // Verify no sensitive user data is included
    expect((post as any).password_hash).toBeUndefined();
    expect((post as any).email).toBeUndefined();
    expect((post as any).user_id).toBeUndefined();
    expect((post as any).credits).toBeUndefined();
  });
});