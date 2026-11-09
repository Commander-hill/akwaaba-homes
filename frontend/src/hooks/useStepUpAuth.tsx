'use client';

import { useState, useCallback, useRef } from 'react';
import StepUpAuthModal, { StepUpActionConfig } from '@/components/admin/StepUpAuthModal';

interface CachedToken {
  token: string;
  expiresAt: number;
}

export function useStepUpAuth() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<StepUpActionConfig | null>(null);
  const cachedTokenRef = useRef<CachedToken | null>(null);

  /**
   * Request step-up authorization for a critical operation.
   * If a valid token was issued less than 5 minutes ago and forceReauth is not true,
   * it executes onSuccess immediately with the cached token.
   */
  const requestStepUp = useCallback((
    config: Omit<StepUpActionConfig, 'onSuccess'> & {
      onSuccess: (token: string) => void | Promise<void>;
      forceReauth?: boolean;
    }
  ) => {
    const now = Date.now();
    // Check if we have an unexpired cached step-up token
    if (
      !config.forceReauth &&
      cachedTokenRef.current &&
      cachedTokenRef.current.expiresAt > now
    ) {
      config.onSuccess(cachedTokenRef.current.token);
      return;
    }

    // Open StepUp Modal
    setCurrentConfig({
      ...config,
      onSuccess: async (token: string) => {
        // Cache token for 5 minutes (300,000 ms) minus 10s buffer
        cachedTokenRef.current = {
          token,
          expiresAt: Date.now() + 290 * 1000,
        };
        await config.onSuccess(token);
      },
    });
    setIsOpen(true);
  }, []);

  const closeStepUpModal = useCallback(() => {
    setIsOpen(false);
    setCurrentConfig(null);
  }, []);

  const StepUpModal = useCallback(() => {
    return (
      <StepUpAuthModal
        isOpen={isOpen}
        onClose={closeStepUpModal}
        actionConfig={currentConfig}
      />
    );
  }, [isOpen, closeStepUpModal, currentConfig]);

  return {
    requestStepUp,
    StepUpModal,
    isStepUpOpen: isOpen,
    closeStepUpModal,
  };
}
