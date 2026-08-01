/** Shared Final Result labels used by Waiting List + Test Reports. */

export const FINAL_RESULT_OPTIONS = [
  { value: 'Negative', label: 'Negative' },
  { value: 'Positive', label: 'Positive' },
  { value: 'Test Cancelled', label: 'Test Cancelled' },
  { value: 'Refusal (Adulterated)', label: 'Refusal (Adulterated)' },
  { value: 'Refusal (Substituted)', label: 'Refusal (Substituted)' },
  { value: 'Dilute', label: 'Dilute' },
  { value: '__other__', label: 'Other' },
] as const;

const FINAL_RESULT_CODE_MAP: Record<string, string> = {
  '1': 'Negative',
  '2': 'Positive',
  '3': 'Test Cancelled',
  '4': 'Refusal (Adulterated)',
  '5': 'Refusal (Substituted)',
  '6': 'Dilute',
};

/** Convert legacy numeric codes (or Other) into display/storage labels. */
export function normalizeFinalResult(
  value?: string | number | null,
  otherText?: string | null,
): string {
  if (value == null) return '';
  const raw = String(value).trim();
  if (raw === '' || raw === '__other__') {
    return otherText != null ? String(otherText).trim() : '';
  }
  if (FINAL_RESULT_CODE_MAP[raw]) return FINAL_RESULT_CODE_MAP[raw];
  return raw;
}

/** Value to use in a Final Result <select>, including Other sentinel. */
export function finalResultSelectValue(stored?: string | null): string {
  const normalized = normalizeFinalResult(stored);
  if (!normalized) return '';
  const known = FINAL_RESULT_OPTIONS.some(
    (opt) => opt.value !== '__other__' && opt.value === normalized,
  );
  return known ? normalized : '__other__';
}
