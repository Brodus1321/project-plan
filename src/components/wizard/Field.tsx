import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, ChevronDown, Lock, Search } from 'lucide-react';

/**
 * Primitif form profesional dipakai seluruh langkah wizard input:
 * label selalu terlihat, tanda * untuk wajib, helper/error dekat field,
 * target sentuh >= 44px, dan focus ring yang jelas (bukan outline dihapus).
 */

const CONTROL_BASE =
  'w-full min-h-[44px] px-3.5 py-2.5 text-[13px] leading-5 rounded-xl border shadow-[0_1px_2px_rgba(15,23,42,0.05)] outline-none transition-[border-color,box-shadow,background-color] duration-150';

function controlClass(opts: {
  error?: string;
  locked?: boolean;
  mono?: boolean;
  prefix?: boolean;
  suffix?: boolean;
  extra?: string;
}): string {
  const { error, locked, mono, prefix, suffix, extra = '' } = opts;

  const tone = locked
    ? 'bg-slate-100/80 border-slate-200 text-slate-500 cursor-not-allowed'
    : error
      ? 'bg-rose-50/50 border-rose-400 text-slate-800 hover:border-rose-400'
      : 'bg-white border-slate-300 text-slate-800 hover:border-slate-400';

  const focusRing = locked
    ? ''
    : error
      ? 'focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
      : 'focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15';

  return [
    CONTROL_BASE,
    tone,
    focusRing,
    mono ? 'font-mono tabular-nums tracking-tight' : '',
    prefix ? 'pl-10' : '',
    suffix ? 'pr-14' : '',
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

const LABEL_CLS = 'text-[12px] font-semibold text-slate-700';

interface FieldFrameProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  hintTone?: 'muted' | 'accent' | 'success';
  error?: string;
  containerClassName?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}

const FieldFrame: React.FC<FieldFrameProps> = ({
  id,
  label,
  required,
  hint,
  hintTone = 'muted',
  error,
  containerClassName = '',
  right,
  children,
}) => {
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;

  return (
    <div className={containerClassName}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className={LABEL_CLS}>
          {label}
          {required && (
            <span className="ml-0.5 text-rose-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
        {right}
      </div>

      {children}

      {error && (
        <p
          id={errId}
          role="alert"
          className="mt-1.5 flex items-start gap-1.5 text-[11px] font-semibold leading-snug text-rose-600"
        >
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {hint && (
        <p
          id={hintId}
          className={`mt-1.5 text-[11px] font-medium leading-snug ${
            hintTone === 'accent'
              ? 'text-teal-700'
              : hintTone === 'success'
                ? 'text-emerald-700'
                : 'text-slate-500'
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
};

const useDescribedBy = (id: string | undefined, error?: string, hint?: unknown) => {
  if (!id) return undefined;
  const ids = [error ? `${id}-err` : '', hint ? `${id}-hint` : ''].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
};

export interface TextFieldProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className' | 'prefix'> {
  id: string;
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  hintTone?: 'muted' | 'accent' | 'success';
  error?: string;
  mono?: boolean;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  containerClassName?: string;
  right?: React.ReactNode;
}

export const TextField: React.FC<TextFieldProps> = ({
  id,
  label,
  required,
  hint,
  hintTone,
  error,
  mono,
  prefix,
  suffix,
  containerClassName,
  right,
  readOnly,
  disabled,
  ...rest
}) => {
  const locked = Boolean(readOnly || disabled);
  const describedBy = useDescribedBy(id, error, hint);

  return (
    <FieldFrame
      id={id}
      label={label}
      required={required}
      hint={hint}
      hintTone={hintTone}
      error={error}
      containerClassName={containerClassName}
      right={right}
    >
      <div className="relative">
        {prefix && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] font-bold ${
              error ? 'text-rose-400' : 'text-slate-400'
            }`}
          >
            {prefix}
          </span>
        )}

        <input
          id={id}
          readOnly={readOnly}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={controlClass({
            error,
            locked,
            mono,
            prefix: !!prefix,
            suffix: !!suffix,
            extra: rest.type === 'number' ? 'no-spin' : '',
          })}
          {...rest}
        />

        {suffix && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400"
          >
            {suffix}
          </span>
        )}

        {locked && rest.type !== 'date' && (
          <Lock
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
          />
        )}
      </div>
    </FieldFrame>
  );
};

export interface SelectFieldProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  id: string;
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  hintTone?: 'muted' | 'accent' | 'success';
  error?: string;
  containerClassName?: string;
  right?: React.ReactNode;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  id,
  label,
  required,
  hint,
  hintTone,
  error,
  containerClassName,
  right,
  children,
  ...rest
}) => {
  const describedBy = useDescribedBy(id, error, hint);

  return (
    <FieldFrame
      id={id}
      label={label}
      required={required}
      hint={hint}
      hintTone={hintTone}
      error={error}
      containerClassName={containerClassName}
      right={right}
    >
      <div className="relative">
        <select
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={controlClass({ error, extra: 'cursor-pointer appearance-none pr-9' })}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        />
      </div>
    </FieldFrame>
  );
};

export interface SearchSelectOption {
  value: string;
  label: string;
}

export interface SearchSelectFieldProps {
  id: string;
  label: string;
  options: SearchSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  required?: boolean;
  hint?: React.ReactNode;
  hintTone?: 'muted' | 'accent' | 'success';
  error?: string;
  containerClassName?: string;
  right?: React.ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
}

/**
 * Dropdown dengan kotak pencarian (combobox). Dipakai untuk daftar panjang
 * di form input: klik untuk buka, ketik untuk filter, panah + Enter untuk
 * pilih, Escape untuk tutup.
 */
export const SearchSelectField: React.FC<SearchSelectFieldProps> = ({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = 'Ketik untuk mencari...',
  emptyLabel = 'Tidak ada data yang cocok',
  required,
  hint,
  hintTone,
  error,
  containerClassName,
  right,
  disabled,
  readOnly,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const locked = Boolean(disabled || readOnly);
  const selected = options.find(o => o.value === value);
  const displayValue = open ? query : (selected?.label ?? '');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      o =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q)
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const idx = filtered.findIndex(o => o.value === value);
    setActive(idx >= 0 ? idx : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  function openList() {
    if (locked) return;
    setQuery('');
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setQuery('');
  }

  function pick(option: SearchSelectOption) {
    onChange(option.value);
    close();
    inputRef.current?.focus();
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setQuery('');
    inputRef.current?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        openList();
        return;
      }
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      setActive(prev => {
        const next = prev + dir;
        if (next < 0) return filtered.length - 1;
        if (next >= filtered.length) return 0;
        return next;
      });
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (open && filtered[active]) pick(filtered[active]);
      else if (!open) openList();
      return;
    }
    if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        close();
      }
      return;
    }
    if (e.key === 'Tab') close();
  }

  const describedBy = useDescribedBy(id, error, hint);
  const listId = `${id}-listbox`;

  return (
    <FieldFrame
      id={id}
      label={label}
      required={required}
      hint={hint}
      hintTone={hintTone}
      error={error}
      containerClassName={containerClassName}
      right={right}
    >
      <div ref={rootRef} className={`relative ${className}`}>
        <div className="relative">
          <Search
            aria-hidden="true"
            className={`pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${
              error ? 'text-rose-400' : 'text-slate-400'
            }`}
          />
          <input
            ref={inputRef}
            id={id}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={open && filtered[active] ? `${id}-opt-${active}` : undefined}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            autoComplete="off"
            disabled={disabled}
            readOnly={readOnly}
            value={displayValue}
            placeholder={selected && !open ? 'Ketik untuk mencari...' : placeholder}
            onFocus={() => !open && !locked && openList()}
            onChange={e => {
              setQuery(e.target.value);
              if (!open) setOpen(true);
            }}
            onKeyDown={onKeyDown}
            className={controlClass({
              error,
              locked,
              extra: 'cursor-text pl-9 pr-9',
            })}
          />

          {selected && !locked && (
            <button
              type="button"
              aria-label={`Hapus pilihan ${label}`}
              onMouseDown={e => e.preventDefault()}
              onClick={clear}
              className="absolute right-8 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <span aria-hidden="true" className="block text-[14px] leading-none">
                ×
              </span>
            </button>
          )}

          <ChevronDown
            aria-hidden="true"
            className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 transition-transform duration-150 ${
              open ? 'rotate-180 text-teal-600' : 'text-slate-400'
            }`}
          />
        </div>

        {open && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={label}
            className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-[0_10px_30px_rgba(15,23,42,0.16)]"
          >
            {filtered.length === 0 && (
              <li className="px-3.5 py-3 text-[12px] font-medium text-slate-400">
                {emptyLabel}
              </li>
            )}
            {filtered.map((o, i) => {
              const isSelected = o.value === value;
              const isActive = i === active;
              return (
                <li
                  key={o.value || '__empty'}
                  id={`${id}-opt-${i}`}
                  data-idx={i}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => pick(o)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex cursor-pointer items-center justify-between gap-2 px-3.5 py-2.5 text-[13px] leading-5 transition-colors ${
                    isActive ? 'bg-teal-50 text-slate-900' : 'text-slate-700'
                  } ${isSelected ? 'font-semibold text-teal-700' : ''}`}
                >
                  <span className="truncate">{o.label}</span>
                  {isSelected && (
                    <span aria-hidden="true" className="text-[12px] font-bold text-teal-600">
                      ✓
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </FieldFrame>
  );
};
