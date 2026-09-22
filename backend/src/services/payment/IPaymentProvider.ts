/**
 * IPaymentProvider Interface
 * 
 * Abstraction layer decoupling the core application logic from specific
 * payment gateways (Paystack, Hubtel, Flutterwave, etc.).
 */

export interface PaymentInitParams {
  amountPesewas: number; // Integer minor units (1 GHS = 100 pesewas)
  email: string;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, any>;
  channels?: string[]; // e.g. ['card', 'mobile_money']
  phoneNumber?: string; // Required for direct MoMo prompt (Hubtel)
}

export interface PaymentInitResult {
  success: boolean;
  authorizationUrl?: string;
  reference: string;
  provider: 'PAYSTACK' | 'HUBTEL';
  rawResponse?: any;
}

export interface PaymentVerificationResult {
  success: boolean;
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'ABANDONED';
  reference: string;
  amountPesewas: number;
  paidAt?: Date;
  channel?: string;
  currency: string;
  rawResponse?: any;
}

export interface IPaymentProvider {
  readonly providerName: 'PAYSTACK' | 'HUBTEL';

  /**
   * Initializes a payment transaction and returns the checkout/authorization URL.
   */
  initializePayment(params: PaymentInitParams): Promise<PaymentInitResult>;

  /**
   * Verifies the status of a transaction directly with the payment gateway.
   */
  verifyPayment(reference: string): Promise<PaymentVerificationResult>;

  /**
   * Validates the cryptographic signature of an incoming webhook request.
   */
  verifyWebhookSignature(signature: string, rawBody: Buffer | string): boolean;

  /**
   * Normalizes incoming webhook payload into a standardized verification result.
   */
  parseWebhookEvent(payload: any): {
    event: string;
    reference: string;
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
    amountPesewas: number;
    metadata?: Record<string, any>;
  } | null;
}
