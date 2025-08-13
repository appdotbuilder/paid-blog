import { db } from '../db';
import { creditPurchasesTable } from '../db/schema';
import { type CreditPurchase } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getCreditHistory(userId: number): Promise<CreditPurchase[]> {
  try {
    // Query credit purchases for the user, ordered by created_at descending (newest first)
    const results = await db.select()
      .from(creditPurchasesTable)
      .where(eq(creditPurchasesTable.user_id, userId))
      .orderBy(desc(creditPurchasesTable.created_at))
      .execute();

    // Convert numeric fields back to numbers and properly type payment_method
    return results.map(purchase => ({
      ...purchase,
      amount_paid: parseFloat(purchase.amount_paid), // Convert string back to number
      payment_method: purchase.payment_method as 'credit_card' | 'paypal' | 'bank_transfer'
    }));
  } catch (error) {
    console.error('Failed to fetch credit history:', error);
    throw error;
  }
}