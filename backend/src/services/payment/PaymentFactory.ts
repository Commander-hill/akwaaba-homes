import { IPaymentProvider } from './IPaymentProvider';
import { PaystackProvider } from './PaystackProvider';
import { HubtelProvider } from './HubtelProvider';

export type SupportedPaymentProvider = 'PAYSTACK' | 'HUBTEL';

/**
 * Payment Provider Factory
 * Resolves active payment providers dynamically based on system configuration,
 * payment channel, or per-transaction override.
 */
export class PaymentFactory {
  private static instances: Map<SupportedPaymentProvider, IPaymentProvider> = new Map();

  static getProvider(providerName?: SupportedPaymentProvider): IPaymentProvider {
    // Default provider from environment or fallback to Paystack
    const activeProvider = providerName || (process.env.DEFAULT_PAYMENT_PROVIDER as SupportedPaymentProvider) || 'PAYSTACK';

    if (!this.instances.has(activeProvider)) {
      if (activeProvider === 'HUBTEL') {
        this.instances.set('HUBTEL', new HubtelProvider());
      } else {
        this.instances.set('PAYSTACK', new PaystackProvider());
      }
    }

    return this.instances.get(activeProvider)!;
  }
}
