import { createHash, randomBytes } from 'crypto';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type RegisterUserInput, type User } from '../schema';

const hashPassword = (password: string, salt: string): string => {
  return createHash('sha256').update(password + salt).digest('hex');
};

export const registerUser = async (input: RegisterUserInput): Promise<User> => {
  try {
    // Generate a random salt and hash the password
    const salt = randomBytes(16).toString('hex');
    const password_hash = salt + ':' + hashPassword(input.password, salt);

    // Insert user record
    const result = await db.insert(usersTable)
      .values({
        email: input.email,
        password_hash: password_hash,
        phone_number: input.phone_number,
        credits: 1 // Users start with 1 credit for their first free post
      })
      .returning()
      .execute();

    // Return the created user
    const user = result[0];
    return {
      ...user
    };
  } catch (error) {
    console.error('User registration failed:', error);
    throw error;
  }
};