'use client';

import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { MdVisibility, MdVisibilityOff } from 'react-icons/md';

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, style, ...props }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <div className="password-input-wrap">
        <input
          {...props}
          ref={ref}
          type={visible ? 'text' : 'password'}
          className={['password-input', className].filter(Boolean).join(' ')}
          style={style}
        />
        <button
          type="button"
          className="password-toggle-btn"
          onClick={() => setVisible(v => !v)}
          tabIndex={-1}
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? (
            <MdVisibilityOff size={18} aria-hidden />
          ) : (
            <MdVisibility size={18} aria-hidden />
          )}
        </button>
      </div>
    );
  },
);

export default PasswordInput;
