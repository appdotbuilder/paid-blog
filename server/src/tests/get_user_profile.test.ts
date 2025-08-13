import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUserProfile } from '../handlers/get_user_profile';

// Test user data
const testUser = {
  email: 'testuser@example.com',
  password_hash: 'hashed_password_123',
  phone_number: '+1234567890',
  credits: 5
};

const testUser2 = {
  email: 'testuser2@example.com',
  password_hash: 'hashed_password_456',
  phone_number: '+9876543210',
  credits: 10
};

describe('getUserProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user profile for existing user', async () => {
    // Create test user
    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const createdUser = insertResult[0];
    
    // Get user profile
    const result = await getUserProfile(createdUser.id);
    
    // Validate returned data
    expect(result.id).toBe(createdUser.id);
    expect(result.email).toBe('testuser@example.com');
    expect(result.phone_number).toBe('+1234567890');
    expect(result.credits).toBe(5);
    expect(result.password_hash).toBe('hashed_password_123');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should return correct user data for different users', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const user2Result = await db.insert(usersTable)
      .values(testUser2)
      .returning()
      .execute();
    
    const user1 = user1Result[0];
    const user2 = user2Result[0];
    
    // Get profiles for both users
    const profile1 = await getUserProfile(user1.id);
    const profile2 = await getUserProfile(user2.id);
    
    // Validate each profile returns correct data
    expect(profile1.id).toBe(user1.id);
    expect(profile1.email).toBe('testuser@example.com');
    expect(profile1.credits).toBe(5);
    
    expect(profile2.id).toBe(user2.id);
    expect(profile2.email).toBe('testuser2@example.com');
    expect(profile2.credits).toBe(10);
    
    // Ensure they are different users
    expect(profile1.id).not.toBe(profile2.id);
    expect(profile1.email).not.toBe(profile2.email);
  });

  it('should return user with default credit value', async () => {
    // Create user with default credits (should be 1 according to schema)
    const userWithDefaults = {
      email: 'defaultuser@example.com',
      password_hash: 'hashed_default_password',
      phone_number: '+5555555555'
      // credits not specified - should use default value from schema
    };
    
    const insertResult = await db.insert(usersTable)
      .values(userWithDefaults)
      .returning()
      .execute();
    
    const createdUser = insertResult[0];
    const result = await getUserProfile(createdUser.id);
    
    expect(result.credits).toBe(1); // Default value from schema
    expect(result.email).toBe('defaultuser@example.com');
    expect(result.phone_number).toBe('+5555555555');
  });

  it('should throw error for non-existent user', async () => {
    // Try to get profile for non-existent user ID
    await expect(getUserProfile(999999)).rejects.toThrow(/User not found/i);
  });

  it('should handle user with zero credits', async () => {
    // Create user with zero credits
    const zeroCreditsUser = {
      email: 'zerocredits@example.com',
      password_hash: 'hashed_zero_credits_password',
      phone_number: '+1111111111',
      credits: 0
    };
    
    const insertResult = await db.insert(usersTable)
      .values(zeroCreditsUser)
      .returning()
      .execute();
    
    const createdUser = insertResult[0];
    const result = await getUserProfile(createdUser.id);
    
    expect(result.credits).toBe(0);
    expect(result.email).toBe('zerocredits@example.com');
    expect(result.id).toBe(createdUser.id);
  });

  it('should preserve timestamp fields correctly', async () => {
    // Create user and get profile
    const insertResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const createdUser = insertResult[0];
    const result = await getUserProfile(createdUser.id);
    
    // Check that timestamps are preserved and are Date objects
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at.getTime()).toBe(createdUser.created_at.getTime());
    expect(result.updated_at.getTime()).toBe(createdUser.updated_at.getTime());
  });
});