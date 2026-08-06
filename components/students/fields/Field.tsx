/**
 * Student Manager field chrome — label, required asterisk, helper, error.
 *
 * The repo's SqInput is `bg-white` with a 2px border; the enrolment screens
 * use a *filled* grey field that turns white on focus. Rather than fork
 * SqInput, these primitives own that one visual difference and keep the same
 * label/helper/error grammar.
 *
 * JIT-safety: every Tailwind class here is a static literal. Nothing is
 * composed with template interpolation.
 */

import React from 'react';

/* Shared class fragments — imported by the sibling field components. */

export const FIELD_BASE =
  'w-full font-cairo font-medium text-slate-800 placeholder:text-slate-400 ' +
  'rounded-xl border transition-colors duration-150 ' +
  'focus:outline-none focus:ring-2 ' +
  'disabled:opacity-60 disabled:cursor-not-allowed';

export const FIELD_PADDING = 'px-4 py-3 text-sm';

export const FIELD_IDLE =
  'bg-slate-50 border-slate-200 focus:bg-white focus:border-sq-accent-500 focus:ring-sq-accent-500/20';

export const FIELD_ERROR =
  'bg-rose-50 border-sq-danger-500 focus:bg-white focus:border-sq-danger-500 focus:ring-sq-danger-500/20';

export const LABEL_CLS = 'block mb-1.5 text-xs font-bold text-slate-600 font-cairo';
export const HELPER_CLS = 'mt-1.5 text-[11px] font-bold text-slate-400 font-cairo';
export const ERROR_CLS = 'mt-1.5 text-[11px] font-bold text-sq-danger-600 font-cairo';

export interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  /** Rendered after the label in muted text, e.g. "(Optional)". */
  optionalHint?: string;
  helper?: string;
  error?: string;
  /** Right-aligned control in the label row, e.g. a regenerate button. */
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/**
 * Wraps a control with its label and message. Children receive the wiring via
 * `fieldAria()` below rather than cloneElement, so the relationship is explicit
 * at each call site.
 */
export const Field: React.FC<FieldProps> = ({
  id,
  label,
  required,
  optionalHint,
  helper,
  error,
  action,
  className,
  children,
}) => (
  <div className={className}>
    <div className="flex items-end justify-between gap-2">
      <label htmlFor={id} className={LABEL_CLS}>
        {label}
        {required && (
          <span className="text-sq-danger-500 ms-0.5" aria-hidden="true">
            *
          </span>
        )}
        {!required && optionalHint && (
          <span className="ms-1 font-medium text-slate-400">{optionalHint}</span>
        )}
      </label>
      {action && <div className="mb-1.5 shrink-0">{action}</div>}
    </div>
    {children}
    {error ? (
      <p id={`${id}-error`} className={ERROR_CLS} role="alert">
        {error}
      </p>
    ) : helper ? (
      <p id={`${id}-helper`} className={HELPER_CLS}>
        {helper}
      </p>
    ) : null}
  </div>
);

/** ARIA wiring for a control inside <Field> with the same `id`. */
export function fieldAria(id: string, opts: { required?: boolean; error?: string; helper?: string }) {
  return {
    id,
    'aria-required': opts.required || undefined,
    'aria-invalid': opts.error ? (true as const) : undefined,
    'aria-describedby': opts.error
      ? `${id}-error`
      : opts.helper
        ? `${id}-helper`
        : undefined,
  };
}

export function fieldClass(error?: string): string {
  return `${FIELD_BASE} ${FIELD_PADDING} ${error ? FIELD_ERROR : FIELD_IDLE}`;
}

export default Field;
