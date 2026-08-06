/**
 * Text / email / tel / date / textarea input in the enrolment field style.
 * Validation is reported on blur, so `onBlur` is a first-class prop here.
 */

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Field, fieldAria, fieldClass, FIELD_BASE, FIELD_PADDING, FIELD_IDLE, FIELD_ERROR } from './Field';

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  locale: 'ar' | 'en';
  type?: 'text' | 'email' | 'tel' | 'date' | 'number';
  multiline?: boolean;
  required?: boolean;
  optionalHint?: string;
  placeholder?: string;
  helper?: string;
  error?: string;
  leadingIcon?: LucideIcon;
  /** Inline prefix pill, e.g. a dial code on a phone field. */
  prefix?: string;
  action?: React.ReactNode;
  inputRef?: React.Ref<HTMLInputElement>;
  className?: string;
  disabled?: boolean;
  autoComplete?: string;
}

export const TextField: React.FC<TextFieldProps> = ({
  id,
  label,
  value,
  onChange,
  onBlur,
  locale,
  type = 'text',
  multiline,
  required,
  optionalHint,
  placeholder,
  helper,
  error,
  leadingIcon: LeadingIcon,
  prefix,
  action,
  inputRef,
  className,
  disabled,
  autoComplete,
}) => {
  const aria = fieldAria(id, { required, error, helper });
  // Dates and phone numbers stay LTR even in an RTL form — an Arabic-direction
  // date input renders its segments in a confusing order.
  const forceLtr = type === 'date' || type === 'tel';
  const dirAttr = forceLtr ? 'ltr' : locale === 'ar' ? 'rtl' : 'ltr';

  const field = (
    <Field
      id={id}
      label={label}
      required={required}
      optionalHint={optionalHint}
      helper={helper}
      error={error}
      action={action}
      className={className}
    >
      {multiline ? (
        <textarea
          {...aria}
          dir={dirAttr}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          rows={3}
          className={`${FIELD_BASE} ${FIELD_PADDING} ${error ? FIELD_ERROR : FIELD_IDLE} resize-y min-h-[84px]`}
        />
      ) : prefix ? (
        <div className="flex items-stretch gap-2">
          {/* dir="ltr" so a dial code renders "+962", not "962+" — the bidi
              algorithm otherwise moves the leading '+' to the visual right. */}
          <span
            dir="ltr"
            className="inline-flex items-center px-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm border border-slate-200 font-cairo shrink-0"
          >
            {prefix}
          </span>
          <input
            {...aria}
            ref={inputRef}
            dir={dirAttr}
            type={type}
            inputMode={type === 'tel' ? 'tel' : undefined}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete={autoComplete}
            className={`${fieldClass(error)} flex-1 min-w-0`}
          />
        </div>
      ) : (
        <div className="relative">
          {/* Logical `start-4` + `ps-11` below: both flip together under RTL.
              Mirroring the position AND the padding double-flips them, which
              lands the padding on the wrong edge and runs text under the icon. */}
          {LeadingIcon && (
            <LeadingIcon
              aria-hidden="true"
              className="absolute top-1/2 -translate-y-1/2 start-4 w-4 h-4 text-slate-400 pointer-events-none"
            />
          )}
          <input
            {...aria}
            ref={inputRef}
            dir={dirAttr}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete={autoComplete}
            className={LeadingIcon ? `${fieldClass(error)} ps-11` : fieldClass(error)}
          />
        </div>
      )}
    </Field>
  );

  return field;
};

export default TextField;
