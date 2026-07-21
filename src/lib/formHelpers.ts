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
