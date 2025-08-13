import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, creditPurchasesTable } from '../db/schema';
import { getCreditHistory } from '../handlers/get_credit_history';

describe('getCreditHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no credit purchases', async () => {
    // Create a user first
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        phone_number: '+1234567890',
        credits: 1
      })
      .returning()
      .execute();

    const result = await getCreditHistory(user[0].id);
    
    expect(result).toEqual([]);
  });

  it('should return credit purchases for specific user only', async () => {
    // Create two users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'user1@example.com',
          password_hash: 'hashedpassword1',
          phone_number: '+1234567890',
          credits: 1
        },
        {
          email: 'user2@example.com',
          password_hash: 'hashedpassword2',
          phone_number: '+0987654321',
          credits: 1
        }
      ])
      .returning()
      .execute();

    const user1Id = users[0].id;
    const user2Id = users[1].id;

    // Create credit purchases for both users
    await db.insert(creditPurchasesTable)
      .values([
        {
          user_id: user1Id,
          credits_purchased: 10,
          amount_paid: '9.99',
          payment_method: 'credit_card',
          transaction_id: 'txn_user1_1'
        },
        {
          user_id: user2Id,
          credits_purchased: 20,
          amount_paid: '19.99',
          payment_method: 'paypal',
          transaction_id: 'txn_user2_1'
        },
        {
          user_id: user1Id,
          credits_purchased: 5,
          amount_paid: '4.99',
          payment_method: 'bank_transfer',
          transaction_id: 'txn_user1_2'
        }
      ])
      .execute();

    // Get credit history for user1
    const user1History = await getCreditHistory(user1Id);
    
    expect(user1History).toHaveLength(2);
    expect(user1History.every(purchase => purchase.user_id === user1Id)).toBe(true);
    expect(user1History.some(purchase => purchase.transaction_id === 'txn_user1_1')).toBe(true);
    expect(user1History.some(purchase => purchase.transaction_id === 'txn_user1_2')).toBe(true);
    expect(user1History.some(purchase => purchase.transaction_id === 'txn_user2_1')).toBe(false);
  });

  it('should return purchases ordered by created_at descending (newest first)', async () => {
    // Create a user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        phone_number: '+1234567890',
        credits: 1
      })
      .returning()
      .execute();

    const userId = user[0].id;

    // Create multiple credit purchases with different timestamps
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    await db.insert(creditPurchasesTable)
      .values([
        {
          user_id: userId,
          credits_purchased: 5,
          amount_paid: '4.99',
          payment_method: 'credit_card',
          transaction_id: 'txn_oldest',
          created_at: twoHoursAgo
        },
        {
          user_id: userId,
          credits_purchased: 15,
          amount_paid: '14.99',
          payment_method: 'paypal',
          transaction_id: 'txn_newest',
          created_at: now
        },
        {
          user_id: userId,
          credits_purchased: 10,
          amount_paid: '9.99',
          payment_method: 'bank_transfer',
          transaction_id: 'txn_middle',
          created_at: oneHourAgo
        }
      ])
      .execute();

    const result = await getCreditHistory(userId);
    
    expect(result).toHaveLength(3);
    expect(result[0].transaction_id).toBe('txn_newest');
    expect(result[1].transaction_id).toBe('txn_middle');
    expect(result[2].transaction_id).toBe('txn_oldest');
    
    // Verify dates are in descending order
    for (let i = 0; i < result.length - 1; i++) {
      expect(result[i].created_at.getTime()).toBeGreaterThanOrEqual(
        result[i + 1].created_at.getTime()
      );
    }
  });

  it('should return properly formatted credit purchase objects', async () => {
    // Create a user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        phone_number: '+1234567890',
        credits: 1
      })
      .returning()
      .execute();

    // Create a credit purchase
    await db.insert(creditPurchasesTable)
      .values({
        user_id: user[0].id,
        credits_purchased: 25,
        amount_paid: '24.99',
        payment_method: 'credit_card',
        transaction_id: 'txn_test_123'
      })
      .execute();

    const result = await getCreditHistory(user[0].id);
    
    expect(result).toHaveLength(1);
    
    const purchase = result[0];
    expect(purchase.id).toBeDefined();
    expect(purchase.user_id).toBe(user[0].id);
    expect(purchase.credits_purchased).toBe(25);
    expect(purchase.amount_paid).toBe(24.99);
    expect(typeof purchase.amount_paid).toBe('number');
    expect(purchase.payment_method).toBe('credit_card');
    expect(purchase.transaction_id).toBe('txn_test_123');
    expect(purchase.created_at).toBeInstanceOf(Date);
  });

  it('should handle non-existent user gracefully', async () => {
    // Try to get credit history for a user that doesn't exist
    const result = await getCreditHistory(99999);
    
    expect(result).toEqual([]);
  });

  it('should convert numeric amount_paid correctly', async () => {
    // Create a user
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashedpassword',
        phone_number: '+1234567890',
        credits: 1
      })
      .returning()
      .execute();

    // Create purchases with different decimal amounts
    await db.insert(creditPurchasesTable)
      .values([
        {
          user_id: user[0].id,
          credits_purchased: 1,
          amount_paid: '0.99',
          payment_method: 'credit_card',
          transaction_id: 'txn_1'
        },
        {
          user_id: user[0].id,
          credits_purchased: 100,
          amount_paid: '99.99',
          payment_method: 'paypal',
          transaction_id: 'txn_2'
        }
      ])
      .execute();

    const result = await getCreditHistory(user[0].id);
    
    expect(result).toHaveLength(2);
    expect(typeof result[0].amount_paid).toBe('number');
    expect(typeof result[1].amount_paid).toBe('number');
    expect(result.find(p => p.transaction_id === 'txn_1')?.amount_paid).toBe(0.99);
    expect(result.find(p => p.transaction_id === 'txn_2')?.amount_paid).toBe(99.99);
  });
});