/**
 * Native <select> in the enrolment field style — native by design, matching
 * SqSelect's choice: it gets mobile pickers, keyboard type-ahead and RTL for
 * free, which a custom listbox would have to re-earn.
 */

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Field, fieldAria, fieldClass } from './Field';

interface SelectFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  locale: 'ar' | 'en';
  options: { value: string; label: string }[];
  placeholder: string;
  required?: boolean;
  optionalHint?: string;
  helper?: string;
  error?: string;
  selectRef?: React.Ref<HTMLSelectElement>;
  className?: string;
  disabled?: boolean;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  id,
  label,
  value,
  onChange,
  onBlur,
  locale,
  options,
  placeholder,
  required,
  optionalHint,
  helper,
  error,
  selectRef,
  className,
  disabled,
}) => {
  const aria = fieldAria(id, { required, error, helper });

  return (
    <Field
      id={id}
      label={label}
      required={required}
      optionalHint={optionalHint}
      helper={helper}
      error={error}
      className={className}
    >
      <div className="relative">
        <select
          {...aria}
          ref={selectRef}
          dir={locale === 'ar' ? 'rtl' : 'ltr'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          className={`${fieldClass(error)} appearance-none pe-10 cursor-pointer`}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {/* Logical `end-4` pairs with the `pe-10` above — both flip under RTL. */}
        <ChevronDown
          aria-hidden="true"
          className="absolute top-1/2 -translate-y-1/2 end-4 w-4 h-4 text-slate-400 pointer-events-none"
        />
      </div>
    </Field>
  );
};

export default SelectField;
