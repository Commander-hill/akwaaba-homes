'use client';
import '@/app/secondary.css';

import React from 'react';
import { AlertTriangle, HelpCircle, Info, CheckCircle, X } from 'lucide-react';
import clsx from 'clsx';

export interface DialogModalState {
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
}

interface DialogModalProps {
  dialogState: DialogModalState;
  inputValue: string;
  onInputChange: (val: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DialogModal({
  dialogState,
  inputValue,
  onInputChange,
  onConfirm,
  onCancel,
}: DialogModalProps) {
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
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-md transition-all">
      <div
        className="w-full max-w-md bg-white dark:bg-[#121216] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.5)] transition-all scale-100"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
          if (e.key === 'Enter' && dialogState.inputType !== 'textarea') onConfirm();
        }}
      >
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
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {dialogState.mode === 'prompt' && (
          <div className="my-4">
            {dialogState.inputType === 'textarea' ? (
              <textarea
                id="dialog-prompt-textarea"
                name="promptInput"
                aria-label={dialogState.placeholder || dialogState.title || 'Prompt input'}
                autoFocus
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder={dialogState.placeholder}
                rows={4}
                className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 dark:text-white placeholder:text-slate-400 resize-none transition"
              />
            ) : (
              <input
                id="dialog-prompt-input"
                name="promptInput"
                aria-label={dialogState.placeholder || dialogState.title || 'Prompt input'}
                autoFocus
                type={dialogState.inputType}
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                placeholder={dialogState.placeholder}
                className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--primary)] text-slate-900 dark:text-white placeholder:text-slate-400 transition"
              />
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 mt-6 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          {dialogState.cancelText && (
            <button
              type="button"
              onClick={onCancel}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {dialogState.cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            className={clsx('px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center gap-2', style.btnBg)}
          >
            <span>{dialogState.confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
