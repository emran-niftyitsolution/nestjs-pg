// src/payments/mock-gateway.util.ts

import { randomBytes } from 'node:crypto';
import { PaymentProvider } from '@/common/enums/payment-provider.enum';
import { PaymentStatus } from '@/common/enums/payment-status.enum';

interface MockGatewayResult {
  status: PaymentStatus;
  transactionReference: string;
  gatewayResponse: Record<string, unknown>;
}

function mockId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString('hex')}`;
}

/**
 * Stands in for an actual call to a payment gateway's API. Each provider
 * gets a response shaped like its real counterpart — Stripe's PaymentIntent,
 * PayPal's order-capture, SSLCommerz's validator payload — which is why
 * `payments.gateway_response` is JSONB rather than a fixed set of columns:
 * there's no shared schema across providers to normalize into.
 *
 * Returns the actual resulting PaymentStatus, not just a success/fail flag:
 * cash never resolves to `success` here at all, no matter what
 * `simulateFailure` says — the money hasn't moved, it's collected later and
 * confirmed by an admin (see AdminPaymentsController's status update).
 */
export function callMockGateway(
  provider: PaymentProvider,
  amount: number,
  simulateFailure: boolean,
): MockGatewayResult {
  if (provider === PaymentProvider.Cash) {
    return {
      status: PaymentStatus.Pending,
      transactionReference: mockId('cod'),
      gatewayResponse: {
        provider: 'cash',
        note: 'Payment will be collected on delivery',
        collectedAt: null,
      },
    };
  }

  const status = simulateFailure ? PaymentStatus.Failed : PaymentStatus.Success;

  switch (provider) {
    case PaymentProvider.Stripe:
      return {
        status,
        transactionReference: mockId('pi'),
        gatewayResponse: {
          provider: 'stripe',
          id: mockId('pi'),
          object: 'payment_intent',
          status: status === PaymentStatus.Success ? 'succeeded' : 'failed',
          amount: Math.round(amount * 100),
          currency: 'usd',
        },
      };

    case PaymentProvider.Paypal:
      return {
        status,
        transactionReference: mockId('PAYPAL'),
        gatewayResponse: {
          provider: 'paypal',
          id: mockId('PAYPAL-ORDER'),
          status: status === PaymentStatus.Success ? 'COMPLETED' : 'DECLINED',
          purchase_units: [
            { amount: { value: amount.toFixed(2), currency_code: 'USD' } },
          ],
        },
      };

    case PaymentProvider.Sslcommerz:
      return {
        status,
        transactionReference: mockId('sslcz'),
        gatewayResponse: {
          provider: 'sslcommerz',
          tran_id: mockId('sslcz'),
          status: status === PaymentStatus.Success ? 'VALID' : 'FAILED',
          amount: amount.toFixed(2),
          currency: 'BDT',
        },
      };

    default:
      throw new Error(`Unhandled payment provider: ${provider}`);
  }
}
