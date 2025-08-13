import { db } from '../db';
import { usersTable, creditPurchasesTable } from '../db/schema';
import { type PurchaseCreditsInput, type CreditPurchase } from '../schema';
import { eq } from 'drizzle-orm';

export async function purchaseCredits(input: PurchaseCreditsInput, userId: number): Promise<CreditPurchase> {
  try {
    // Verify user exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (existingUsers.length === 0) {
      throw new Error('User not found');
    }

    const user = existingUsers[0];

    // Calculate total amount (5 credits for $1)
    const creditsPerDollar = 5;
    const amountPaid = input.credits / creditsPerDollar;

    // Simulate payment processing based on payment method
    const transactionId = await simulatePayment(input.payment_method, amountPaid, input.payment_details);

    // Record the purchase transaction
    const purchaseResult = await db.insert(creditPurchasesTable)
      .values({
        user_id: userId,
        credits_purchased: input.credits,
        amount_paid: amountPaid.toString(), // Convert number to string for numeric column
        payment_method: input.payment_method,
        transaction_id: transactionId
      })
      .returning()
      .execute();

    // Update user's credit balance
    await db.update(usersTable)
      .set({
        credits: user.credits + input.credits,
        updated_at: new Date()
      })
      .where(eq(usersTable.id, userId))
      .execute();

    // Convert numeric field back to number before returning
    const purchase = purchaseResult[0];
    return {
      ...purchase,
      amount_paid: parseFloat(purchase.amount_paid), // Convert string back to number
      payment_method: purchase.payment_method as 'credit_card' | 'paypal' | 'bank_transfer'
    };
  } catch (error) {
    console.error('Credit purchase failed:', error);
    throw error;
  }
}

// Simulate payment processing
async function simulatePayment(
  paymentMethod: 'credit_card' | 'paypal' | 'bank_transfer',
  amount: number,
  paymentDetails?: { card_number?: string; paypal_email?: string; bank_account?: string }
): Promise<string> {
  // Generate a realistic transaction ID
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substr(2, 9);
  
  switch (paymentMethod) {
    case 'credit_card':
      if (!paymentDetails?.card_number) {
        throw new Error('Credit card number is required for credit card payments');
      }
      return `cc_${timestamp}_${randomId}`;
    
    case 'paypal':
      if (!paymentDetails?.paypal_email) {
        throw new Error('PayPal email is required for PayPal payments');
      }
      return `pp_${timestamp}_${randomId}`;
    
    case 'bank_transfer':
      if (!paymentDetails?.bank_account) {
        throw new Error('Bank account is required for bank transfer payments');
      }
      return `bt_${timestamp}_${randomId}`;
    
    default:
      throw new Error('Invalid payment method');
  }
}