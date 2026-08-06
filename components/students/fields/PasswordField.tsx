/**
 * Password with reveal + generate.
 *
 * Staff read this value aloud or copy it onto paper when handing a student
 * their login, so it defaults to *visible* — masking a password nobody is
 * protecting yet only creates transcription errors. The toggle is still there
 * for shoulder-surfing situations.
 */

import React from 'react';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Field, fieldAria, fieldClass } from './Field';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onGenerate: () => void;
  locale: 'ar' | 'en';
  visible: boolean;
  onToggleVisible: () => void;
  showLabel: string;
  hideLabel: string;
  generateLabel: string;
  required?: boolean;
  helper?: string;
  error?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  className?: string;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  id,
  label,
  value,
  onChange,
  onBlur,
  onGenerate,
  locale,
  visible,
  onToggleVisible,
  showLabel,
  hideLabel,
  generateLabel,
  required,
  helper,
  error,
  inputRef,
  className,
}) => {
  const aria = fieldAria(id, { required, error, helper });

  return (
    <Field
      id={id}
      label={label}
      required={required}
      helper={helper}
      error={error}
      className={className}
      action={
        <button
          type="button"
          onClick={onGenerate}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-sq-accent-600 hover:text-sq-accent-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500 rounded px-1 py-0.5 font-cairo"
        >
          <RefreshCw className="w-3 h-3" aria-hidden="true" />
          {generateLabel}
        </button>
      }
    >
      <div className="relative">
        <input
          {...aria}
          ref={inputRef}
          dir="ltr"
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          autoComplete="new-password"
          className={`${fieldClass(error)} pe-11 font-mono tracking-wide`}
        />
        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={visible ? hideLabel : showLabel}
          className="absolute top-1/2 -translate-y-1/2 end-3 p-1 rounded text-slate-400 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </Field>
  );
};

export default PasswordField;
