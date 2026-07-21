'use client';

type PageLoaderProps = {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Center loader in available space with min height */
  centered?: boolean;
};

export default function PageLoader({
  message = 'Loading...',
  size = 'md',
  className = '',
  centered = true,
}: PageLoaderProps) {
  return (
    <div
      className={`page-loader page-loader-${size}${centered ? ' page-loader-centered' : ''}${className ? ` ${className}` : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="page-loader-spinner" aria-hidden />
      {message ? <p className="page-loader-text">{message}</p> : null}
    </div>
  );
}
