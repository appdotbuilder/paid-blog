import { createHash, timingSafeEqual } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginUserInput, type AuthContext } from '../schema';

// Simple password hashing using Node.js built-in crypto
const hashPassword = (password: string, salt: string): string => {
  return createHash('sha256').update(password + salt).digest('hex');
};

// Simple salt generation
const generateSalt = (): string => {
  return Math.random().toString(36).substring(2, 15);
};

// Safe password comparison to prevent timing attacks
const comparePasswords = (provided: string, stored: string, salt: string): boolean => {
  const providedHash = hashPassword(provided, salt);
  const storedBuffer = Buffer.from(stored, 'hex');
  const providedBuffer = Buffer.from(providedHash, 'hex');
  
  if (storedBuffer.length !== providedBuffer.length) {
    return false;
  }
  
  return timingSafeEqual(storedBuffer, providedBuffer);
};

export async function loginUser(input: LoginUserInput): Promise<AuthContext> {
  try {
    // Find user by email
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.email, input.email))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = users[0];

    // For simplicity, we'll assume password_hash contains "hash:salt"
    // In a real app, you'd want to use bcrypt or similar
    const [storedHash, salt] = user.password_hash.split(':');
    
    if (!storedHash || !salt) {
      throw new Error('Invalid password format');
    }

    // Verify password
    const isPasswordValid = comparePasswords(input.password, storedHash, salt);
    
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Return auth context
    return {
      user_id: user.id,
      email: user.email
    };
  } catch (error) {
    console.error('User login failed:', error);
    throw error;
  }
}

// Export helper functions for testing
export { hashPassword, generateSalt };