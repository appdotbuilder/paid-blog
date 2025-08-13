import { db } from '../db';
import { usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type User } from '../schema';

export const getUserProfile = async (userId: number): Promise<User> => {
  try {
    // Query user by ID
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (result.length === 0) {
      throw new Error('User not found');
    }

    const user = result[0];
    
    // Return user data - password_hash is included in schema but should be handled carefully
    // Note: In a production system, you might want to exclude password_hash from the return type
    return {
      id: user.id,
      email: user.email,
      password_hash: user.password_hash,
      phone_number: user.phone_number,
      credits: user.credits,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Get user profile failed:', error);
    throw error;
  }
};