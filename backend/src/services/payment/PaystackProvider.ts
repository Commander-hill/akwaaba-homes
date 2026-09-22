import axios from 'axios';
import crypto from 'crypto';
import { IPaymentProvider, PaymentInitParams, PaymentInitResult, PaymentVerificationResult } from './IPaymentProvider';

export class PaystackProvider implements IPaymentProvider {
  readonly providerName = 'PAYSTACK' as const;
  private readonly secretKey: string;
  private readonly baseUrl = 'https://api.paystack.co';

  constructor(secretKey?: string) {
    this.secretKey = secretKey || process.env.PAYSTACK_SECRET_KEY || '';
  }

  async initializePayment(params: PaymentInitParams): Promise<PaymentInitResult> {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured');
    }

    const payload = {
      email: params.email,
      amount: params.amountPesewas,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
      channels: params.channels || ['card', 'mobile_money']
    };

    const response = await axios.post(`${this.baseUrl}/transaction/initialize`, payload, {
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json'
      }
    });

    return {
      success: response.data.status,
      authorizationUrl: response.data.data.authorization_url,
      reference: response.data.data.reference,
      provider: 'PAYSTACK',
      rawResponse: response.data
    };
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    if (!this.secretKey) {
      throw new Error('Paystack secret key is not configured');
    }

    const response = await axios.get(`${this.baseUrl}/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${this.secretKey}`
      }
    });

    const data = response.data?.data;
    const isSuccess = data?.status === 'success';

    let status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'ABANDONED' = 'PENDING';
    if (data?.status === 'success') status = 'SUCCESS';
    else if (data?.status === 'failed') status = 'FAILED';
    else if (data?.status === 'abandoned') status = 'ABANDONED';

    return {
      success: isSuccess,
      status,
      reference: data?.reference || reference,
      amountPesewas: data?.amount || 0,
      paidAt: data?.paid_at ? new Date(data.paid_at) : undefined,
      channel: data?.channel,
      currency: data?.currency || 'GHS',
      rawResponse: data
    };
  }

  verifyWebhookSignature(signature: string, rawBody: Buffer | string): boolean {
    if (!this.secretKey || !signature) return false;

    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(rawBody)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
  }

  parseWebhookEvent(payload: any) {
    if (!payload || !payload.event) return null;

    const data = payload.data;
    let status: 'SUCCESS' | 'FAILED' | 'PENDING' = 'PENDING';
    if (data?.status === 'success') status = 'SUCCESS';
    else if (data?.status === 'failed') status = 'FAILED';

    return {
      event: payload.event,
      reference: data?.reference,
      status,
      amountPesewas: data?.amount || 0,
      metadata: data?.metadata
    };
  }
}
