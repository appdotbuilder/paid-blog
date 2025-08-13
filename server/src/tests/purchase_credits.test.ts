import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, creditPurchasesTable } from '../db/schema';
import { type PurchaseCreditsInput } from '../schema';
import { purchaseCredits } from '../handlers/purchase_credits';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  email: 'test@example.com',
  password_hash: 'hashed_password',
  phone_number: '+1234567890',
  credits: 10 // Starting with 10 credits
};

// Test input for credit card payment
const creditCardInput: PurchaseCreditsInput = {
  credits: 25,
  payment_method: 'credit_card',
  payment_details: {
    card_number: '4111111111111111'
  }
};

// Test input for PayPal payment
const paypalInput: PurchaseCreditsInput = {
  credits: 50,
  payment_method: 'paypal',
  payment_details: {
    paypal_email: 'user@paypal.com'
  }
};

// Test input for bank transfer
const bankTransferInput: PurchaseCreditsInput = {
  credits: 100,
  payment_method: 'bank_transfer',
  payment_details: {
    bank_account: '1234567890'
  }
};

describe('purchaseCredits', () => {
  let userId: number;

  beforeEach(async () => {
    await createDB();
    
    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    userId = userResult[0].id;
  });

  afterEach(resetDB);

  it('should purchase credits with credit card', async () => {
    const result = await purchaseCredits(creditCardInput, userId);

    // Verify purchase record
    expect(result.user_id).toEqual(userId);
    expect(result.credits_purchased).toEqual(25);
    expect(result.amount_paid).toEqual(5); // 25 credits / 5 credits per dollar = $5
    expect(result.payment_method).toEqual('credit_card');
    expect(result.transaction_id).toMatch(/^cc_\d+_[a-z0-9]+$/);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(typeof result.amount_paid).toBe('number');
  });

  it('should purchase credits with PayPal', async () => {
    const result = await purchaseCredits(paypalInput, userId);

    expect(result.credits_purchased).toEqual(50);
    expect(result.amount_paid).toEqual(10); // 50 credits / 5 credits per dollar = $10
    expect(result.payment_method).toEqual('paypal');
    expect(result.transaction_id).toMatch(/^pp_\d+_[a-z0-9]+$/);
  });

  it('should purchase credits with bank transfer', async () => {
    const result = await purchaseCredits(bankTransferInput, userId);

    expect(result.credits_purchased).toEqual(100);
    expect(result.amount_paid).toEqual(20); // 100 credits / 5 credits per dollar = $20
    expect(result.payment_method).toEqual('bank_transfer');
    expect(result.transaction_id).toMatch(/^bt_\d+_[a-z0-9]+$/);
  });

  it('should update user credit balance correctly', async () => {
    const initialCredits = 10;
    const creditsToPurchase = 25;

    await purchaseCredits(creditCardInput, userId);

    // Check updated user credits
    const updatedUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    const updatedUser = updatedUsers[0];
    expect(updatedUser.credits).toEqual(initialCredits + creditsToPurchase); // 10 + 25 = 35
    expect(updatedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should save purchase record to database', async () => {
    const result = await purchaseCredits(creditCardInput, userId);

    // Query the purchase record
    const purchases = await db.select()
      .from(creditPurchasesTable)
      .where(eq(creditPurchasesTable.id, result.id))
      .execute();

    expect(purchases).toHaveLength(1);
    const savedPurchase = purchases[0];
    expect(savedPurchase.user_id).toEqual(userId);
    expect(savedPurchase.credits_purchased).toEqual(25);
    expect(parseFloat(savedPurchase.amount_paid)).toEqual(5);
    expect(savedPurchase.payment_method).toEqual('credit_card');
    expect(savedPurchase.transaction_id).toMatch(/^cc_\d+_[a-z0-9]+$/);
    expect(savedPurchase.created_at).toBeInstanceOf(Date);
  });

  it('should calculate correct amount for different credit quantities', async () => {
    // Test 1 credit = $0.20
    const smallInput: PurchaseCreditsInput = {
      credits: 1,
      payment_method: 'credit_card',
      payment_details: { card_number: '4111111111111111' }
    };

    const smallResult = await purchaseCredits(smallInput, userId);
    expect(smallResult.amount_paid).toEqual(0.2); // 1 / 5 = 0.2

    // Test 150 credits = $30
    const largeInput: PurchaseCreditsInput = {
      credits: 150,
      payment_method: 'paypal',
      payment_details: { paypal_email: 'test@paypal.com' }
    };

    const largeResult = await purchaseCredits(largeInput, userId);
    expect(largeResult.amount_paid).toEqual(30); // 150 / 5 = 30
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserId = 99999;

    await expect(purchaseCredits(creditCardInput, nonExistentUserId))
      .rejects.toThrow(/user not found/i);
  });

  it('should throw error for credit card payment without card number', async () => {
    const invalidInput: PurchaseCreditsInput = {
      credits: 10,
      payment_method: 'credit_card',
      payment_details: {} // Missing card_number
    };

    await expect(purchaseCredits(invalidInput, userId))
      .rejects.toThrow(/credit card number is required/i);
  });

  it('should throw error for PayPal payment without email', async () => {
    const invalidInput: PurchaseCreditsInput = {
      credits: 10,
      payment_method: 'paypal',
      payment_details: {} // Missing paypal_email
    };

    await expect(purchaseCredits(invalidInput, userId))
      .rejects.toThrow(/paypal email is required/i);
  });

  it('should throw error for bank transfer without account', async () => {
    const invalidInput: PurchaseCreditsInput = {
      credits: 10,
      payment_method: 'bank_transfer',
      payment_details: {} // Missing bank_account
    };

    await expect(purchaseCredits(invalidInput, userId))
      .rejects.toThrow(/bank account is required/i);
  });

  it('should throw error for invalid payment method', async () => {
    const invalidInput = {
      credits: 10,
      payment_method: 'invalid_method',
      payment_details: {}
    } as any; // TypeScript bypass for testing invalid input

    await expect(purchaseCredits(invalidInput, userId))
      .rejects.toThrow(/invalid payment method/i);
  });

  it('should handle multiple purchases for same user', async () => {
    // First purchase
    await purchaseCredits(creditCardInput, userId); // 25 credits
    
    // Second purchase
    await purchaseCredits(paypalInput, userId); // 50 credits

    // Check final credit balance
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    const user = users[0];
    expect(user.credits).toEqual(85); // 10 (initial) + 25 + 50 = 85

    // Check both purchase records exist
    const purchases = await db.select()
      .from(creditPurchasesTable)
      .where(eq(creditPurchasesTable.user_id, userId))
      .execute();

    expect(purchases).toHaveLength(2);
    
    // Verify transaction IDs are different
    const transactionIds = purchases.map(p => p.transaction_id);
    expect(new Set(transactionIds).size).toEqual(2); // All unique
  });
});