import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, postsTable } from '../db/schema';
import { type CreatePostInput } from '../schema';
import { createPost } from '../handlers/create_post';
import { eq } from 'drizzle-orm';
import { promises as fs } from 'fs';
import { join } from 'path';

// Test input with all required fields
const testInput: CreatePostInput = {
  title: 'Test Post',
  description: 'A test post description',
  image_data: Buffer.from('test image data').toString('base64'),
  image_filename: 'test-image.jpg'
};

// Helper to create a test user
const createTestUser = async (credits: number = 1) => {
  const result = await db.insert(usersTable)
    .values({
      email: 'test@example.com',
      password_hash: 'hashed_password',
      phone_number: '+1234567890',
      credits
    })
    .returning()
    .execute();
  
  return result[0];
};

// Helper to clean up uploaded files
const cleanupUploads = async () => {
  const uploadsDir = join(process.cwd(), 'uploads');
  try {
    const files = await fs.readdir(uploadsDir);
    await Promise.all(
      files.map(file => fs.unlink(join(uploadsDir, file)).catch(() => {}))
    );
  } catch {
    // Directory doesn't exist or is empty
  }
};

describe('createPost', () => {
  beforeEach(createDB);
  afterEach(async () => {
    await cleanupUploads();
    await resetDB();
  });

  it('should create first post for free (no credit deduction)', async () => {
    const user = await createTestUser(1); // User starts with 1 credit
    
    const result = await createPost(testInput, user.id);

    // Verify post creation
    expect(result.title).toEqual('Test Post');
    expect(result.description).toEqual(testInput.description);
    expect(result.user_id).toEqual(user.id);
    expect(result.image_path).toMatch(/^\/uploads\/\d+-test-image\.jpg$/);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.expires_at).toBeInstanceOf(Date);

    // Verify expiration is 24 hours from now (with 1 minute tolerance)
    const now = new Date();
    const expectedExpiry = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const timeDiff = Math.abs(result.expires_at.getTime() - expectedExpiry.getTime());
    expect(timeDiff).toBeLessThan(60 * 1000); // Within 1 minute

    // Verify user still has 1 credit (first post is free)
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();
    
    expect(updatedUsers[0].credits).toEqual(1);
  });

  it('should deduct 5 credits for subsequent posts', async () => {
    const user = await createTestUser(10); // User has 10 credits
    
    // Create first post (free)
    await createPost(testInput, user.id);
    
    // Create second post (should cost 5 credits)
    const secondPostInput = {
      ...testInput,
      title: 'Second Post',
      image_filename: 'second-image.jpg'
    };
    
    const result = await createPost(secondPostInput, user.id);

    // Verify second post creation
    expect(result.title).toEqual('Second Post');
    expect(result.user_id).toEqual(user.id);

    // Verify credits were deducted (10 - 5 = 5)
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();
    
    expect(updatedUsers[0].credits).toEqual(5);
  });

  it('should save post to database with correct data', async () => {
    const user = await createTestUser();
    
    const result = await createPost(testInput, user.id);

    // Query database to verify post was saved
    const posts = await db.select()
      .from(postsTable)
      .where(eq(postsTable.id, result.id))
      .execute();

    expect(posts).toHaveLength(1);
    expect(posts[0].title).toEqual('Test Post');
    expect(posts[0].description).toEqual(testInput.description);
    expect(posts[0].user_id).toEqual(user.id);
    expect(posts[0].image_path).toMatch(/^\/uploads\/\d+-test-image\.jpg$/);
    expect(posts[0].created_at).toBeInstanceOf(Date);
    expect(posts[0].expires_at).toBeInstanceOf(Date);
  });

  it('should save image file to filesystem', async () => {
    const user = await createTestUser();
    
    const result = await createPost(testInput, user.id);

    // Extract filename from image_path
    const filename = result.image_path.replace('/uploads/', '');
    const filePath = join(process.cwd(), 'uploads', filename);

    // Verify file exists and has correct content
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);

    const fileContent = await fs.readFile(filePath);
    const expectedContent = Buffer.from(testInput.image_data, 'base64');
    expect(fileContent.equals(expectedContent)).toBe(true);
  });

  it('should throw error when user does not exist', async () => {
    const nonExistentUserId = 999;

    await expect(createPost(testInput, nonExistentUserId))
      .rejects.toThrow(/user not found/i);
  });

  it('should throw error when user has insufficient credits for second post', async () => {
    const user = await createTestUser(3); // User has only 3 credits
    
    // Create first post (free)
    await createPost(testInput, user.id);
    
    // Attempt second post (needs 5 credits but only has 3)
    const secondPostInput = {
      ...testInput,
      title: 'Second Post',
      image_filename: 'second-image.jpg'
    };

    await expect(createPost(secondPostInput, user.id))
      .rejects.toThrow(/insufficient credits.*required: 5.*available: 3/i);
  });

  it('should generate unique filenames to prevent conflicts', async () => {
    const user = await createTestUser(10);
    
    // Create two posts with same image filename
    const result1 = await createPost(testInput, user.id);
    
    const secondInput = {
      ...testInput,
      title: 'Second Post'
      // Same image_filename: 'test-image.jpg'
    };
    
    const result2 = await createPost(secondInput, user.id);

    // Verify different file paths were generated
    expect(result1.image_path).not.toEqual(result2.image_path);
    expect(result1.image_path).toMatch(/^\/uploads\/\d+-test-image\.jpg$/);
    expect(result2.image_path).toMatch(/^\/uploads\/\d+-test-image\.jpg$/);
  });

  it('should handle user with exact credits needed for second post', async () => {
    const user = await createTestUser(5); // User has exactly 5 credits
    
    // Create first post (free)
    await createPost(testInput, user.id);
    
    // Create second post (should use all remaining credits)
    const secondPostInput = {
      ...testInput,
      title: 'Second Post',
      image_filename: 'second-image.jpg'
    };
    
    const result = await createPost(secondPostInput, user.id);

    expect(result.title).toEqual('Second Post');

    // Verify user has 0 credits remaining
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();
    
    expect(updatedUsers[0].credits).toEqual(0);
  });
});