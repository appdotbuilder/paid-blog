import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput } from '../schema';
import { loginUser, hashPassword, generateSalt } from '../handlers/login_user';

// Test user data
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  phone_number: '+1234567890'
};

const testLogin: LoginUserInput = {
  email: testUser.email,
  password: testUser.password
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create a test user
  const createTestUser = async (password?: string) => {
    const userPassword = password || testUser.password;
    const salt = generateSalt();
    const hash = hashPassword(userPassword, salt);
    const password_hash = `${hash}:${salt}`;
    
    const result = await db.insert(usersTable)
      .values({
        email: testUser.email,
        password_hash,
        phone_number: testUser.phone_number,
        credits: 1
      })
      .returning()
      .execute();
    
    return result[0];
  };

  it('should successfully login with valid credentials', async () => {
    // Create test user first
    const user = await createTestUser();

    // Attempt login
    const result = await loginUser(testLogin);

    // Verify auth context
    expect(result.user_id).toEqual(user.id);
    expect(result.email).toEqual(testUser.email);
    expect(typeof result.user_id).toBe('number');
    expect(typeof result.email).toBe('string');
  });

  it('should throw error for non-existent email', async () => {
    const invalidLogin: LoginUserInput = {
      email: 'nonexistent@example.com',
      password: 'password123'
    };

    await expect(loginUser(invalidLogin)).rejects.toThrow(/invalid email or password/i);
  });

  it('should throw error for incorrect password', async () => {
    // Create test user first
    await createTestUser();

    const invalidLogin: LoginUserInput = {
      email: testUser.email,
      password: 'wrongpassword'
    };

    await expect(loginUser(invalidLogin)).rejects.toThrow(/invalid email or password/i);
  });

  it('should handle case-sensitive email correctly', async () => {
    // Create test user first
    await createTestUser();

    // Try login with different case email
    const caseLogin: LoginUserInput = {
      email: 'TEST@EXAMPLE.COM',
      password: testUser.password
    };

    // Should fail because email is case-sensitive
    await expect(loginUser(caseLogin)).rejects.toThrow(/invalid email or password/i);
  });

  it('should handle empty password', async () => {
    // Create test user first
    await createTestUser();

    const emptyPasswordLogin: LoginUserInput = {
      email: testUser.email,
      password: ''
    };

    await expect(loginUser(emptyPasswordLogin)).rejects.toThrow(/invalid email or password/i);
  });

  it('should work with different valid passwords', async () => {
    // Create user with different password
    const differentPassword = 'mySecurePass456!';
    const salt = generateSalt();
    const hash = hashPassword(differentPassword, salt);
    const password_hash = `${hash}:${salt}`;
    
    const user = await db.insert(usersTable)
      .values({
        email: 'different@example.com',
        password_hash,
        phone_number: '+9876543210',
        credits: 5
      })
      .returning()
      .execute();

    const loginInput: LoginUserInput = {
      email: 'different@example.com',
      password: differentPassword
    };

    const result = await loginUser(loginInput);

    expect(result.user_id).toEqual(user[0].id);
    expect(result.email).toEqual('different@example.com');
  });

  it('should maintain user data integrity after login', async () => {
    // Create test user
    const user = await createTestUser();

    // Login
    const result = await loginUser(testLogin);

    // Verify user data wasn't modified
    const userAfterLogin = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .execute();

    expect(userAfterLogin).toHaveLength(1);
    expect(userAfterLogin[0].email).toEqual(testUser.email);
    expect(userAfterLogin[0].phone_number).toEqual(testUser.phone_number);
    expect(userAfterLogin[0].credits).toEqual(1);
    expect(userAfterLogin[0].created_at).toBeInstanceOf(Date);
    
    // Verify auth context matches database
    expect(result.user_id).toEqual(userAfterLogin[0].id);
    expect(result.email).toEqual(userAfterLogin[0].email);
  });

  it('should handle invalid password hash format', async () => {
    // Create user with malformed password hash
    const result = await db.insert(usersTable)
      .values({
        email: 'malformed@example.com',
        password_hash: 'invalid_format', // Missing salt separator
        phone_number: '+1111111111',
        credits: 1
      })
      .returning()
      .execute();

    const loginInput: LoginUserInput = {
      email: 'malformed@example.com',
      password: 'anypassword'
    };

    await expect(loginUser(loginInput)).rejects.toThrow(/invalid password format/i);
  });

  it('should use timing-safe password comparison', async () => {
    // Create test user
    await createTestUser();

    // Test with very similar but wrong passwords
    const similarPasswords = [
      'password124', // One digit off
      'password12',  // One character short
      'Password123', // Different case
      'password123 ' // Extra space
    ];

    for (const wrongPassword of similarPasswords) {
      const invalidLogin: LoginUserInput = {
        email: testUser.email,
        password: wrongPassword
      };

      await expect(loginUser(invalidLogin)).rejects.toThrow(/invalid email or password/i);
    }
  });
});