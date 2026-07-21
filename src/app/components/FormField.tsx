import type { ReactNode } from 'react';

type FormGroupProps = {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
};

export function FormGroup({ label, htmlFor, required, error, children }: FormGroupProps) {
  return (
    <div className="form-group">
      <label htmlFor={htmlFor}>
        {label}
        {required && <span className="required-star">*</span>}
      </label>
      {children}
      <FieldError message={error} />
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <div
      role="alert"
      className="patient-field-error"
      style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: '0.35rem', fontWeight: 500 }}
    >
      {message}
    </div>
  );
}
