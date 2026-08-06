/**
 * Student photo — click-to-browse plus drag-and-drop, stored as a data URL.
 *
 * The FileReader → dataURL pattern (including the `e.target.value = ''` reset
 * so re-picking the same file still fires onChange) comes from
 * components/schedule/ProfileTab.tsx:219-231. The dashed drop-target treatment
 * follows components/admin-hub/attendance/BulkActionsPanel.tsx.
 */

import React, { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { LABEL_CLS } from './Field';

const MAX_BYTES = 2 * 1024 * 1024; // 2MB — localStorage quota is ~5MB total

interface PhotoFieldProps {
  label: string;
  dropHint: string;
  removeLabel: string;
  value: string;
  onChange: (dataUrl: string) => void;
  locale: 'ar' | 'en';
  className?: string;
}

export const PhotoField: React.FC<PhotoFieldProps> = ({
  label,
  dropHint,
  removeLabel,
  value,
  onChange,
  locale,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const readFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(locale === 'ar' ? 'يجب اختيار صورة' : 'Please choose an image file');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(locale === 'ar' ? 'الحجم الأقصى ٢ ميجابايت' : 'Maximum size is 2MB');
      return;
    }
    setError('');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') onChange(reader.result);
    };
    reader.onerror = () => {
      setError(locale === 'ar' ? 'تعذّر قراءة الملف' : 'Could not read that file');
    };
    reader.readAsDataURL(file);
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    readFile(e.target.files?.[0]);
    // Reset so selecting the same file twice still fires onChange.
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    readFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className={className}>
      <span className={LABEL_CLS}>{label}</span>

      {value ? (
        <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group">
          <img src={value} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="p-2 rounded-lg bg-white/90 text-slate-700 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500"
              aria-label={label}
            >
              <ImagePlus className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-2 rounded-lg bg-white/90 text-sq-danger-600 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-danger-500"
              aria-label={removeLabel}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={
            dragOver
              ? 'w-32 h-32 rounded-2xl border-2 border-dashed border-sq-accent-500 bg-sq-accent-50 flex flex-col items-center justify-center gap-1.5 px-2 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500'
              : 'w-32 h-32 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-1.5 px-2 text-center transition-colors hover:border-slate-400 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sq-accent-500'
          }
        >
          <ImagePlus className={dragOver ? 'w-5 h-5 text-sq-accent-500' : 'w-5 h-5 text-slate-400'} />
          <span className="text-[10px] font-bold text-slate-400 font-cairo leading-tight">
            {dropHint}
          </span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleInput}
        className="hidden"
        tabIndex={-1}
      />

      {error && (
        <p className="mt-1.5 text-[11px] font-bold text-sq-danger-600 font-cairo" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default PhotoField;
