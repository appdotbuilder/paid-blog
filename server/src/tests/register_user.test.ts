import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { createHash } from 'crypto';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput } from '../schema';
import { registerUser } from '../handlers/register_user';
import { eq } from 'drizzle-orm';

// Helper function to verify password hash
const verifyPassword = (password: string, hash: string): boolean => {
  const [salt, storedHash] = hash.split(':');
  const computedHash = createHash('sha256').update(password + salt).digest('hex');
  return computedHash === storedHash;
};

// Test input with all required fields
const testInput: RegisterUserInput = {
  email: 'test@example.com',
  password: 'password123',
  phone_number: '+1234567890'
};

describe('registerUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with hashed password', async () => {
    const result = await registerUser(testInput);

    // Basic field validation
    expect(result.email).toEqual('test@example.com');
    expect(result.phone_number).toEqual('+1234567890');
    expect(result.credits).toEqual(1);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Password should be hashed, not plain text
    expect(result.password_hash).not.toEqual('password123');
    expect(typeof result.password_hash).toBe('string');
    expect(result.password_hash.length).toBeGreaterThan(0);

    // Verify password was hashed correctly
    const isValidHash = verifyPassword('password123', result.password_hash);
    expect(isValidHash).toBe(true);
    
    // Hash should contain salt separator
    expect(result.password_hash.includes(':')).toBe(true);
  });

  it('should save user to database', async () => {
    const result = await registerUser(testInput);

    // Query the database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    expect(savedUser.email).toEqual('test@example.com');
    expect(savedUser.phone_number).toEqual('+1234567890');
    expect(savedUser.credits).toEqual(1);
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);

    // Verify password hash was saved correctly
    const isValidHash = verifyPassword('password123', savedUser.password_hash);
    expect(isValidHash).toBe(true);
  });

  it('should start new users with 1 credit', async () => {
    const result = await registerUser(testInput);

    expect(result.credits).toEqual(1);

    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users[0].credits).toEqual(1);
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await registerUser(testInput);

    // Try to create second user with same email
    const duplicateInput: RegisterUserInput = {
      ...testInput,
      phone_number: '+9876543210' // Different phone number
    };

    await expect(registerUser(duplicateInput)).rejects.toThrow();
  });

  it('should handle different email formats', async () => {
    const inputs: RegisterUserInput[] = [
      {
        email: 'user.name@domain.com',
        password: 'password123',
        phone_number: '+1111111111'
      },
      {
        email: 'test+tag@example.org',
        password: 'password456',
        phone_number: '+2222222222'
      },
      {
        email: 'simple@test.co.uk',
        password: 'password789',
        phone_number: '+3333333333'
      }
    ];

    for (const input of inputs) {
      const result = await registerUser(input);
      expect(result.email).toEqual(input.email);
      expect(result.phone_number).toEqual(input.phone_number);
      expect(result.credits).toEqual(1);

      // Verify password hashing worked
      const isValidHash = verifyPassword(input.password, result.password_hash);
      expect(isValidHash).toBe(true);
    }
  });

  it('should hash different passwords differently', async () => {
    const input1: RegisterUserInput = {
      email: 'user1@example.com',
      password: 'password123',
      phone_number: '+1111111111'
    };

    const input2: RegisterUserInput = {
      email: 'user2@example.com',
      password: 'differentpassword456',
      phone_number: '+2222222222'
    };

    const user1 = await registerUser(input1);
    const user2 = await registerUser(input2);

    // Different passwords should result in different hashes
    expect(user1.password_hash).not.toEqual(user2.password_hash);

    // But both should be valid when verified
    const isValid1 = verifyPassword('password123', user1.password_hash);
    const isValid2 = verifyPassword('differentpassword456', user2.password_hash);

    expect(isValid1).toBe(true);
    expect(isValid2).toBe(true);
  });

  it('should generate unique salts for same password', async () => {
    const input1: RegisterUserInput = {
      email: 'user1@example.com',
      password: 'samepassword',
      phone_number: '+1111111111'
    };

    const input2: RegisterUserInput = {
      email: 'user2@example.com',
      password: 'samepassword',
      phone_number: '+2222222222'
    };

    const user1 = await registerUser(input1);
    const user2 = await registerUser(input2);

    // Same password should have different hashes due to different salts
    expect(user1.password_hash).not.toEqual(user2.password_hash);

    // Extract salts from hashes
    const salt1 = user1.password_hash.split(':')[0];
    const salt2 = user2.password_hash.split(':')[0];
    
    // Salts should be different
    expect(salt1).not.toEqual(salt2);

    // Both should still verify correctly
    const isValid1 = verifyPassword('samepassword', user1.password_hash);
    const isValid2 = verifyPassword('samepassword', user2.password_hash);

    expect(isValid1).toBe(true);
    expect(isValid2).toBe(true);
  });
});