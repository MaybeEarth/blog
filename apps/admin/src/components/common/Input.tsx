import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`block w-full rounded-lg border px-3.5 py-2 text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors dark:bg-slate-900 dark:text-slate-100 dark:placeholder-slate-500 ${
            error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500 dark:border-rose-700'
              : 'border-slate-300 dark:border-slate-700'
          } ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';
