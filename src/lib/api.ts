import toast from 'react-hot-toast';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export type ApiEnvelope<T = unknown> = {
  response_code: string;
  obj: T;
  message?: string;
};

export type PortalTokenKey =
  | 'superadmin_token'
  | 'admin_token'
  | 'b2b_token'
  | 'corporate_token';

export function getToken(tokenKey?: PortalTokenKey | string): string {
  if (typeof window === 'undefined') return '';
  if (tokenKey) return localStorage.getItem(tokenKey) || '';
  return (
    localStorage.getItem('superadmin_token') ||
    localStorage.getItem('admin_token') ||
    localStorage.getItem('b2b_token') ||
    localStorage.getItem('corporate_token') ||
    ''
  );
}

export function toastApiError(error: unknown, fallback = 'Request failed.') {
  const message =
    error instanceof Error && error.message
      ? error.message
      : typeof error === 'string'
        ? error
        : fallback;
  toast.error(message);
  return message;
}

export function toastApiSuccess(message: string) {
  toast.success(message);
}

type ApiFetchOptions = RequestInit & {
  tokenKey?: PortalTokenKey | string;
  skipAuth?: boolean;
  /** When true, accept HTTP ok even if response_code is not 200 (matches some auth pages). */
  acceptHttpOk?: boolean;
  /** Fallback message when API error payload is not a string. */
  errorFallback?: string;
  /** Shown via react-hot-toast on successful response. */
  successMessage?: string;
  /** When false, skip automatic error toast. Default: true. */
  showErrorToast?: boolean;
  /** When true, skip both success and error toasts. */
  silent?: boolean;
};

export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function extractErrorMessage(
  data: ApiEnvelope<unknown> & { message?: string },
  errorFallback?: string,
): string {
  if (typeof data.obj === 'string' && data.obj.trim()) return data.obj;
  if (typeof data.message === 'string' && data.message.trim()) return data.message;
  return errorFallback || 'Request failed.';
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const {
    tokenKey,
    skipAuth,
    acceptHttpOk,
    errorFallback,
    successMessage,
    showErrorToast = true,
    silent = false,
    headers,
    body,
    ...rest
  } = options;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const requestHeaders: HeadersInit = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(headers || {}),
  };

  if (!skipAuth) {
    const token = getToken(tokenKey);
    if (token) {
      (requestHeaders as Record<string, string>).token = token;
    }
  }

  let res: Response;
  try {
    res = await fetch(path.startsWith('http') ? path : `${API_BASE}${path}`, {
      ...rest,
      headers: requestHeaders,
      body,
    });
  } catch {
    const message = 'Unable to connect to server. Please try again.';
    if (!silent && showErrorToast) toast.error(message);
    throw new ApiError(message);
  }

  // Blob / file downloads: no JSON envelope
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/pdf') || contentType.includes('octet-stream')) {
    if (!res.ok) {
      const message = errorFallback || 'Download failed.';
      if (!silent && showErrorToast) toast.error(message);
      throw new ApiError(message);
    }
    if (!silent && successMessage) toast.success(successMessage);
    return (await res.blob()) as T;
  }

  let data: ApiEnvelope<T> & { message?: string };
  try {
    data = await res.json();
  } catch {
    const message = 'Unable to connect to server. Please try again.';
    if (!silent && showErrorToast) toast.error(message);
    throw new ApiError(message);
  }

  const ok = data.response_code === '200' || (acceptHttpOk && res.ok);
  if (!ok) {
    const message = extractErrorMessage(data, errorFallback);
    if (!silent && showErrorToast) toast.error(message);
    throw new ApiError(message);
  }

  if (!silent && successMessage) toast.success(successMessage);
  return data.obj as T;
}

/**
 * Lightweight helper for existing raw-fetch call sites.
 * Parses the Metrolab `{ response_code, obj }` envelope and toasts on fail/success.
 */
export async function handleApiResponse<T = unknown>(
  res: Response,
  options: {
    successMessage?: string;
    errorFallback?: string;
    acceptHttpOk?: boolean;
    showErrorToast?: boolean;
    silent?: boolean;
  } = {},
): Promise<T> {
  const {
    successMessage,
    errorFallback,
    acceptHttpOk,
    showErrorToast = true,
    silent = false,
  } = options;

  let data: ApiEnvelope<T> & { message?: string };
  try {
    data = await res.json();
  } catch {
    const message = 'Unable to connect to server. Please try again.';
    if (!silent && showErrorToast) toast.error(message);
    throw new ApiError(message);
  }

  const ok = data.response_code === '200' || (acceptHttpOk && res.ok);
  if (!ok) {
    const message = extractErrorMessage(data, errorFallback);
    if (!silent && showErrorToast) toast.error(message);
    throw new ApiError(message);
  }

  if (!silent && successMessage) toast.success(successMessage);
  return data.obj as T;
}
