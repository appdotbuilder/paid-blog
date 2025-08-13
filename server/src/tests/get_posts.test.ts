import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { postsTable } from '../db/schema';
import { getPosts } from '../handlers/get_posts';

describe('getPosts', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no posts exist', async () => {
    const result = await getPosts();
    expect(result).toEqual([]);
  });

  it('should return all posts with correct field types and active status', async () => {
    const now = new Date();
    const futureExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours later
    const pastExpiry = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

    // Create test posts - one active, one expired
    await db.insert(postsTable).values([
      {
        title: 'Active Post',
        content: 'This post is still active',
        price: '19.99',
        posted_at: now,
        expires_at: futureExpiry,
        created_at: now,
        updated_at: now
      },
      {
        title: 'Expired Post',
        content: 'This post has expired',
        price: '29.99',
        posted_at: new Date(now.getTime() - 25 * 60 * 60 * 1000), // 25 hours ago
        expires_at: pastExpiry,
        created_at: new Date(now.getTime() - 25 * 60 * 60 * 1000),
        updated_at: new Date(now.getTime() - 25 * 60 * 60 * 1000)
      }
    ]).execute();

    const result = await getPosts();

    expect(result).toHaveLength(2);

    // Verify first post (should be active post due to desc order by posted_at)
    const activePost = result[0];
    expect(activePost.title).toEqual('Active Post');
    expect(activePost.content).toEqual('This post is still active');
    expect(activePost.price).toEqual(19.99);
    expect(typeof activePost.price).toBe('number'); // Verify numeric conversion
    expect(activePost.is_active).toBe(true);
    expect(activePost.id).toBeDefined();
    expect(activePost.posted_at).toBeInstanceOf(Date);
    expect(activePost.expires_at).toBeInstanceOf(Date);
    expect(activePost.created_at).toBeInstanceOf(Date);
    expect(activePost.updated_at).toBeInstanceOf(Date);

    // Verify second post (should be expired post)
    const expiredPost = result[1];
    expect(expiredPost.title).toEqual('Expired Post');
    expect(expiredPost.content).toEqual('This post has expired');
    expect(expiredPost.price).toEqual(29.99);
    expect(typeof expiredPost.price).toBe('number'); // Verify numeric conversion
    expect(expiredPost.is_active).toBe(false);
  });

  it('should return posts ordered by posted_at descending', async () => {
    const baseTime = new Date();
    const futureExpiry = new Date(baseTime.getTime() + 24 * 60 * 60 * 1000);

    // Create posts with different posted_at times
    await db.insert(postsTable).values([
      {
        title: 'First Post',
        content: 'Posted first',
        price: '10.00',
        posted_at: new Date(baseTime.getTime() - 3600000), // 1 hour ago
        expires_at: futureExpiry,
        created_at: baseTime,
        updated_at: baseTime
      },
      {
        title: 'Latest Post',
        content: 'Posted last',
        price: '20.00',
        posted_at: baseTime, // Most recent
        expires_at: futureExpiry,
        created_at: baseTime,
        updated_at: baseTime
      },
      {
        title: 'Middle Post',
        content: 'Posted in between',
        price: '15.00',
        posted_at: new Date(baseTime.getTime() - 1800000), // 30 minutes ago
        expires_at: futureExpiry,
        created_at: baseTime,
        updated_at: baseTime
      }
    ]).execute();

    const result = await getPosts();

    expect(result).toHaveLength(3);
    expect(result[0].title).toEqual('Latest Post'); // Most recent first
    expect(result[1].title).toEqual('Middle Post'); // Middle next
    expect(result[2].title).toEqual('First Post'); // Oldest last

    // Verify ordering is correct
    expect(result[0].posted_at >= result[1].posted_at).toBe(true);
    expect(result[1].posted_at >= result[2].posted_at).toBe(true);
  });

  it('should correctly calculate is_active for edge cases', async () => {
    const now = new Date();
    const justExpired = new Date(now.getTime() - 1000); // 1 second ago
    const justActive = new Date(now.getTime() + 1000); // 1 second from now

    await db.insert(postsTable).values([
      {
        title: 'Just Expired',
        content: 'Expired 1 second ago',
        price: '5.00',
        posted_at: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        expires_at: justExpired,
        created_at: now,
        updated_at: now
      },
      {
        title: 'Just Active',
        content: 'Expires in 1 second',
        price: '10.00',
        posted_at: now,
        expires_at: justActive,
        created_at: now,
        updated_at: now
      }
    ]).execute();

    const result = await getPosts();

    expect(result).toHaveLength(2);
    
    const justActivePost = result.find(p => p.title === 'Just Active');
    const justExpiredPost = result.find(p => p.title === 'Just Expired');

    expect(justActivePost?.is_active).toBe(true);
    expect(justExpiredPost?.is_active).toBe(false);
  });

  it('should handle decimal prices correctly', async () => {
    const now = new Date();
    const futureExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await db.insert(postsTable).values({
      title: 'Decimal Price Post',
      content: 'Post with decimal price',
      price: '123.45', // String representation of decimal
      posted_at: now,
      expires_at: futureExpiry,
      created_at: now,
      updated_at: now
    }).execute();

    const result = await getPosts();

    expect(result).toHaveLength(1);
    expect(result[0].price).toEqual(123.45);
    expect(typeof result[0].price).toBe('number');
  });
});