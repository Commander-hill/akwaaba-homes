'use client';

import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import type { DialogModalState } from './DialogModal';

const DialogModal = dynamic(() => import('./DialogModal'), { ssr: false });

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

interface PromptOptions {
  title?: string;
  message: string;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  inputType?: 'text' | 'number' | 'date' | 'textarea';
}

interface AlertOptions {
  title?: string;
  message: string;
  confirmText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
}

interface DialogContextType {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  prompt: (options: PromptOptions | string) => Promise<string | null>;
  alert: (options: AlertOptions | string) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const [dialogState, setDialogState] = useState<DialogModalState>({
    isOpen: false,
    mode: 'confirm',
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'warning',
    defaultValue: '',
    placeholder: '',
    inputType: 'text',
  });

  const [inputValue, setInputValue] = useState('');
  const resolverRef = useRef<((value: any) => void) | null>(null);

  const confirm = (options: ConfirmOptions | string): Promise<boolean> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      const opts = typeof options === 'string' ? { message: options } : options;
      setDialogState({
        isOpen: true,
        mode: 'confirm',
        title: opts.title || 'Confirm Action',
        message: opts.message,
        confirmText: opts.confirmText || 'Confirm',
        cancelText: opts.cancelText || 'Cancel',
        type: opts.type || (opts.message.toLowerCase().includes('delete') || opts.message.toLowerCase().includes('remove') || opts.message.toLowerCase().includes('revoke') ? 'danger' : 'warning'),
        inputType: 'text',
      });
    });
  };

  const prompt = (options: PromptOptions | string): Promise<string | null> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      const opts = typeof options === 'string' ? { message: options } : options;
      setInputValue(opts.defaultValue || '');
      setDialogState({
        isOpen: true,
        mode: 'prompt',
        title: opts.title || 'Provide Information',
        message: opts.message,
        confirmText: opts.confirmText || 'Submit',
        cancelText: opts.cancelText || 'Cancel',
        type: 'info',
        defaultValue: opts.defaultValue || '',
        placeholder: opts.placeholder || '',
        inputType: opts.inputType || 'text',
      });
    });
  };

  const alert = (options: AlertOptions | string): Promise<void> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      const opts = typeof options === 'string' ? { message: options } : options;
      setDialogState({
        isOpen: true,
        mode: 'alert',
        title: opts.title || 'Notice',
        message: opts.message,
        confirmText: opts.confirmText || 'Got it',
        cancelText: '',
        type: opts.type || 'info',
        inputType: 'text',
      });
    });
  };

  const handleConfirm = () => {
    if (resolverRef.current) {
      if (dialogState.mode === 'confirm') {
        resolverRef.current(true);
      } else if (dialogState.mode === 'prompt') {
        resolverRef.current(inputValue);
      } else {
        resolverRef.current(undefined);
      }
    }
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    setInputValue('');
  };

  const handleCancel = () => {
    if (resolverRef.current) {
      if (dialogState.mode === 'confirm') {
        resolverRef.current(false);
      } else if (dialogState.mode === 'prompt') {
        resolverRef.current(null);
      } else {
        resolverRef.current(undefined);
      }
    }
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    setInputValue('');
  };

  return (
    <DialogContext.Provider value={{ confirm, prompt, alert }}>
      {children}
      {dialogState.isOpen && (
        <DialogModal
          dialogState={dialogState}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </DialogContext.Provider>
  );
};
