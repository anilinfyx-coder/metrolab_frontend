import type { CSSProperties } from 'react';
import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form';
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
