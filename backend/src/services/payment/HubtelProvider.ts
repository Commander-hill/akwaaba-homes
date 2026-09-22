import axios from 'axios';
import crypto from 'crypto';
import { IPaymentProvider, PaymentInitParams, PaymentInitResult, PaymentVerificationResult } from './IPaymentProvider';

/**
 * Hubtel Payment Provider
 * 
 * Implements Hubtel Merchant Direct Debit & Online Checkout APIs,
 * supporting MTN MoMo, Telecel Cash, and AT Money in Ghana.
 */
export class HubtelProvider implements IPaymentProvider {
  readonly providerName = 'HUBTEL' as const;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly merchantAccountNumber: string;
  private readonly baseUrl = 'https://api-topups.hubtel.com/v2/merchantaccount/merchants';

  constructor(clientId?: string, clientSecret?: string, merchantAccountNumber?: string) {
    this.clientId = clientId || process.env.HUBTEL_CLIENT_ID || '';
    this.clientSecret = clientSecret || process.env.HUBTEL_CLIENT_SECRET || '';
    this.merchantAccountNumber = merchantAccountNumber || process.env.HUBTEL_MERCHANT_ACCOUNT_NUMBER || '';
  }

  private getBasicAuthHeader(): string {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  async initializePayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Hubtel credentials are not configured');
    }

    // Hubtel amounts are in GHS (decimal) rather than pesewas integer
    const amountGhs = params.amountPesewas / 100;

    const payload = {
      totalAmount: amountGhs,
      description: params.metadata?.description || `Akwaaba Homes Payment ${params.reference}`,
      callbackUrl: params.callbackUrl,
      returnUrl: params.callbackUrl,
      merchantAccountNumber: this.merchantAccountNumber,
      cancellationUrl: params.callbackUrl,
      clientReference: params.reference,
    };

    const response = await axios.post(
      `${this.baseUrl}/${this.merchantAccountNumber}/postprocess/onlinecheckout/invoice/create`,
      payload,
      {
        headers: {
          Authorization: this.getBasicAuthHeader(),
          'Content-Type': 'application/json'
        }
      }
    );

    const data = response.data?.data;

    return {
      success: response.data?.responseCode === '0000',
      authorizationUrl: data?.checkoutUrl || data?.checkoutDirectUrl,
      reference: params.reference,
      provider: 'HUBTEL',
      rawResponse: response.data
    };
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Hubtel credentials are not configured');
    }

    const response = await axios.get(
      `${this.baseUrl}/${this.merchantAccountNumber}/status/check?clientReference=${reference}`,
      {
        headers: {
          Authorization: this.getBasicAuthHeader()
        }
      }
    );

    const data = response.data?.data;
    const statusStr = String(data?.status || '').toLowerCase();

    let status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'ABANDONED' = 'PENDING';
    if (statusStr === 'paid' || statusStr === 'success' || response.data?.responseCode === '0000') {
      status = 'SUCCESS';
    } else if (statusStr === 'failed' || statusStr === 'unpaid') {
      status = 'FAILED';
    } else if (statusStr === 'expired') {
      status = 'ABANDONED';
    }

    return {
      success: status === 'SUCCESS',
      status,
      reference,
      amountPesewas: Math.round((data?.amount || 0) * 100),
      paidAt: data?.transactionDate ? new Date(data.transactionDate) : undefined,
      channel: data?.paymentMethod || 'mobile_money',
      currency: 'GHS',
      rawResponse: data
    };
  }

  verifyWebhookSignature(signature: string, rawBody: Buffer | string): boolean {
    if (!this.clientSecret || !signature) return false;

    // Hubtel webhook signature validation using HMAC-SHA256 or Basic Auth secret matching
    const computedSignature = crypto
      .createHmac('sha256', this.clientSecret)
      .update(rawBody)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(computedSignature),
        Buffer.from(signature)
      );
    } catch {
      return false;
    }
  }

  parseWebhookEvent(payload: any) {
    if (!payload) return null;

    const data = payload.Data || payload.data || payload;
    const statusStr = String(data.Status || data.status || '').toLowerCase();

    let status: 'SUCCESS' | 'FAILED' | 'PENDING' = 'PENDING';
    if (statusStr === 'success' || statusStr === 'paid') status = 'SUCCESS';
    else if (statusStr === 'failed') status = 'FAILED';

    return {
      event: payload.Event || 'transaction.status',
      reference: data.ClientReference || data.clientReference,
      status,
      amountPesewas: Math.round((data.Amount || data.amount || 0) * 100),
      metadata: data
    };
  }
}
