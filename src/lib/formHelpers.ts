import type { ChangeEvent, CSSProperties } from 'react';
import type {
  FieldErrors,
  FieldValues,
  Path,
  RegisterOptions,
  Resolver,
  UseFormRegister,
} from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import type * as yup from 'yup';

export function formResolver<T extends FieldValues>(schema: yup.AnyObjectSchema): Resolver<T> {
  return yupResolver(schema) as Resolver<T>;
}

export function focusFirstInvalidField<T extends FieldValues>(errors: FieldErrors<T>) {
  const firstKey = Object.keys(errors)[0];
  if (!firstKey) return;

  window.setTimeout(() => {
    const el =
      document.querySelector<HTMLElement>(`[data-field="${firstKey}"]`) ||
      document.querySelector<HTMLElement>(`[data-staff-field="${firstKey}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus();
  }, 0);
}

export function createInvalidHandler<T extends FieldValues>() {
  return (errors: FieldErrors<T>) => {
    focusFirstInvalidField(errors);
  };
}

export function fieldStyle(hasError: boolean, extra?: CSSProperties): CSSProperties {
  return {
    width: '100%',
    background: 'var(--bg-input)',
    border: `1px solid ${hasError ? '#ef4444' : 'var(--border)'}`,
    borderRadius: 6,
    padding: '0.5rem',
    color: 'var(--text)',
    boxShadow: hasError ? '0 0 0 1px rgba(239,68,68,0.15)' : 'none',
    ...extra,
  };
}

/** Auto password: letters, numbers, and only @ / # as special characters. */
export function generateAutoPassword(length = 10): string {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = '@#';
  const all = lower + upper + digits + special;
  const pick = (set: string) => set.charAt(Math.floor(Math.random() * set.length));

  const chars = [pick(lower), pick(upper), pick(digits), pick(special)];
  while (chars.length < Math.max(6, length)) {
    chars.push(pick(all));
  }

  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/** Mobile / phone fields: digits only, hard-capped at 10. */
export const MOBILE_MAX_DIGITS = 10;

export function sanitizeMobileDigits(value: string, maxDigits = MOBILE_MAX_DIGITS): string {
  return String(value ?? '').replace(/\D/g, '').slice(0, maxDigits);
}

export function isMobileFieldName(name: string): boolean {
  const key = name.toLowerCase();
  return (
    key === 'mobile' ||
    key.endsWith('_mobile') ||
    key === 'public_phone_no' ||
    key.endsWith('_phone') ||
    key.endsWith('_phone_no')
  );
}

/**
 * react-hook-form register wrapper for mobile/phone inputs.
 * Blocks non-digits and stops entry after 10 digits (including paste).
 */
export function registerMobile<TFieldValues extends FieldValues>(
  register: UseFormRegister<TFieldValues>,
  name: Path<TFieldValues>,
  options?: RegisterOptions<TFieldValues, Path<TFieldValues>>,
) {
  const registration = register(name, options);
  return {
    ...registration,
    inputMode: 'numeric' as const,
    maxLength: MOBILE_MAX_DIGITS,
    autoComplete: 'tel' as const,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      e.target.value = sanitizeMobileDigits(e.target.value);
      return registration.onChange(e);
    },
  };
}
