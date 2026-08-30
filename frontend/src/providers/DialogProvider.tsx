'use client';

import React, { createContext, useContext, useState, useRef, ReactNode } from 'react';
import { AlertTriangle, HelpCircle, Info, CheckCircle, X, Sparkles } from 'lucide-react';
import clsx from 'clsx';

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
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    mode: 'confirm' | 'prompt' | 'alert';
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    type: 'danger' | 'warning' | 'info' | 'success';
    defaultValue?: string;
    placeholder?: string;
    inputType: 'text' | 'number' | 'date' | 'textarea';
  }>({
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

  const getTypeStyles = () => {
    switch (dialogState.type) {
      case 'danger':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-rose-500" />,
          badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30',
          btnBg: 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30',
        };
      case 'success':
        return {
          icon: <CheckCircle className="w-6 h-6 text-emerald-500" />,
          badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
          btnBg: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30',
        };
      case 'info':
        return {
          icon: <Info className="w-6 h-6 text-indigo-500" />,
          badgeBg: 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30',
          btnBg: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30',
        };
      default:
        return {
          icon: <HelpCircle className="w-6 h-6 text-amber-500" />,
          badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30',
          btnBg: 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg shadow-amber-600/30',
        };
    }
  };

  const style = getTypeStyles();

  return (
    <DialogContext.Provider value={{ confirm, prompt, alert }}>
      {children}

      {dialogState.isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md transition-all">
          <div
            className="w-full max-w-md bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] transition-all scale-100"
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleCancel();
              if (e.key === 'Enter' && dialogState.inputType !== 'textarea') handleConfirm();
            }}
          >
            {/* Header Badge & Title */}
            <div className="flex items-start gap-4 mb-4">
              <div className={clsx('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner', style.badgeBg)}>
                {style.icon}
              </div>
              <div className="flex-1 min-w-0 pt-0.5">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                  {dialogState.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 font-medium leading-relaxed whitespace-pre-line">
                  {dialogState.message}
                </p>
              </div>
              <button
                onClick={handleCancel}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prompt Input Area */}
            {dialogState.mode === 'prompt' && (
              <div className="my-4">
                {dialogState.inputType === 'textarea' ? (
                  <textarea
                    autoFocus
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={dialogState.placeholder}
                    rows={4}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 dark:text-white placeholder:text-slate-400 resize-none transition"
                  />
                ) : (
                  <input
                    autoFocus
                    type={dialogState.inputType}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={dialogState.placeholder}
                    className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 dark:text-white placeholder:text-slate-400 transition"
                  />
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80">
              {dialogState.cancelText && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  {dialogState.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                className={clsx('px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2', style.btnBg)}
              >
                <span>{dialogState.confirmText}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
};
