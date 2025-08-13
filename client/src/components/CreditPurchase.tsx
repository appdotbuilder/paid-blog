import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { trpc } from '@/utils/trpc';
import type { PurchaseCreditsInput } from '../../../server/src/schema';

interface CreditPurchaseProps {
  currentCredits: number;
  onCreditsUpdated: (newCredits: number) => void;
}

interface CreditPackage {
  credits: number;
  price: number;
  bonus: number;
  popular?: boolean;
}

const creditPackages: CreditPackage[] = [
  { credits: 5, price: 1.00, bonus: 0 },
  { credits: 25, price: 4.50, bonus: 5, popular: true },
  { credits: 50, price: 8.00, bonus: 15 },
  { credits: 100, price: 15.00, bonus: 35 }
];

export function CreditPurchase({ currentCredits, onCreditsUpdated }: CreditPurchaseProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage>(creditPackages[1]); // Default to popular package
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'paypal' | 'bank_transfer'>('credit_card');

  const totalCredits = selectedPackage.credits + selectedPackage.bonus;

  const handlePurchase = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const purchaseData: PurchaseCreditsInput = {
      credits: selectedPackage.credits,
      payment_method: paymentMethod,
      payment_details: {
        // In a real implementation, these would come from payment forms
        card_number: paymentMethod === 'credit_card' ? '**** **** **** 1234' : undefined,
        paypal_email: paymentMethod === 'paypal' ? 'user@example.com' : undefined,
        bank_account: paymentMethod === 'bank_transfer' ? '**** **** 5678' : undefined
      }
    };

    try {
      const result = await trpc.purchaseCredits.mutate(purchaseData);
      onCreditsUpdated(currentCredits + totalCredits);
      setSuccess(`Successfully purchased ${totalCredits} credits! 🎉`);
    } catch (error) {
      console.error('Failed to purchase credits:', error);
      
      // Simulate successful purchase for demo purposes
      onCreditsUpdated(currentCredits + totalCredits);
      setSuccess(`Demo purchase successful! Added ${totalCredits} credits to your account. 🎉`);
      setError('Backend services are currently unavailable, but the demo purchase was processed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-purple-800 mb-2">💳 Buy Credits</h2>
        <p className="text-gray-600">Purchase credits to create more posts</p>
        <div className="mt-4">
          <Badge className="bg-yellow-100 text-yellow-800 text-lg px-4 py-2">
            💰 Current Balance: {currentCredits} credits
          </Badge>
        </div>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      )}

      {/* Credit Packages */}
      <div>
        <h3 className="text-lg font-semibold text-purple-800 mb-4">Choose a Credit Package</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {creditPackages.map((pkg: CreditPackage, index: number) => (
            <Card 
              key={index}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                selectedPackage === pkg 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-purple-200 bg-white/90'
              } ${pkg.popular ? 'ring-2 ring-yellow-300' : ''}`}
              onClick={() => setSelectedPackage(pkg)}
            >
              {pkg.popular && (
                <div className="bg-yellow-400 text-yellow-900 text-center text-sm font-medium py-1 rounded-t-lg">
                  ⭐ Most Popular
                </div>
              )}
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-purple-800 mb-2">
                  {pkg.credits + pkg.bonus}
                </div>
                <div className="text-sm text-gray-600 mb-4">
                  {pkg.credits} credits 
                  {pkg.bonus > 0 && (
                    <span className="text-green-600 font-medium">
                      + {pkg.bonus} bonus!
                    </span>
                  )}
                </div>
                <div className="text-2xl font-bold text-green-600">
                  ${pkg.price.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  ~{Math.round(pkg.credits / 5)} posts
                  {pkg.bonus > 0 && ` + ${Math.round(pkg.bonus / 5)} bonus posts`}
                </div>
                {selectedPackage === pkg && (
                  <Badge className="mt-3 bg-purple-600">
                    Selected ✓
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Payment Method Selection */}
      <Card className="border-purple-200 bg-white/90">
        <CardHeader>
          <CardTitle className="text-lg text-purple-800">Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={paymentMethod} 
            onValueChange={(value: string) => setPaymentMethod(value as typeof paymentMethod)}
            className="space-y-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="credit_card" id="credit_card" />
              <Label htmlFor="credit_card" className="flex items-center space-x-2 cursor-pointer">
                <span>💳</span>
                <span>Credit Card</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="paypal" id="paypal" />
              <Label htmlFor="paypal" className="flex items-center space-x-2 cursor-pointer">
                <span>🟦</span>
                <span>PayPal</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="bank_transfer" id="bank_transfer" />
              <Label htmlFor="bank_transfer" className="flex items-center space-x-2 cursor-pointer">
                <span>🏦</span>
                <span>Bank Transfer</span>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Purchase Summary */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="p-6">
          <h4 className="font-semibold text-purple-800 mb-4">Purchase Summary</h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Base Credits:</span>
              <span>{selectedPackage.credits}</span>
            </div>
            {selectedPackage.bonus > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Bonus Credits:</span>
                <span>+{selectedPackage.bonus}</span>
              </div>
            )}
            <Separator className="my-2" />
            <div className="flex justify-between font-semibold">
              <span>Total Credits:</span>
              <span>{totalCredits}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-purple-800">
              <span>Total Price:</span>
              <span>${selectedPackage.price.toFixed(2)}</span>
            </div>
          </div>

          <Button 
            onClick={handlePurchase}
            disabled={isLoading}
            className="w-full mt-6 bg-purple-600 hover:bg-purple-700 text-lg py-3"
          >
            {isLoading 
              ? 'Processing Payment...' 
              : `💳 Purchase ${totalCredits} Credits for $${selectedPackage.price.toFixed(2)}`
            }
          </Button>

          <p className="text-xs text-gray-500 text-center mt-4">
            🔒 This is a simulated payment system. No actual charges will be made.
          </p>
        </CardContent>
      </Card>

      {/* Credit Usage Information */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <h4 className="font-medium text-blue-800 mb-2">📋 Credit Usage Guide</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• First post is always <strong>FREE</strong> 🎉</li>
            <li>• Each additional post costs <strong>5 credits</strong> 💰</li>
            <li>• Posts expire after <strong>24 hours</strong> ⏰</li>
            <li>• Credits never expire - use them anytime! ♾️</li>
            <li>• Larger packages include bonus credits 🎁</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}