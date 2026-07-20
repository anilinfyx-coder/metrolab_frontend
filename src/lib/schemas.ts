import * as yup from 'yup';

export const emailSchema = yup
  .string()
  .trim()
  .required('Email address is required.')
  .email('Please enter a valid email address.');

export const loginSchema = yup.object({
  username: yup.string().trim().required('Email address is required.'),
  password: yup.string().required('Password is required.'),
});

export type LoginFormValues = yup.InferType<typeof loginSchema>;

export const forgotPasswordSchema = yup.object({
  email: emailSchema,
});

export type ForgotPasswordFormValues = yup.InferType<typeof forgotPasswordSchema>;

export const resetPasswordSchema = yup.object({
  password: yup.string().required('Password is required.'),
  confirmPassword: yup
    .string()
    .required('Please confirm your password.')
    .oneOf([yup.ref('password')], 'Passwords do not match.'),
});

export type ResetPasswordFormValues = yup.InferType<typeof resetPasswordSchema>;

/** Matches existing app password rule: min 6, only @# as special characters. */
export const appPasswordSchema = yup
  .string()
  .required('Password is required.')
  .min(6, 'Password must be at least 6 characters.')
  .test(
    'allowed-special',
    'Password can only contain letters, numbers, and @# special characters.',
    value => !value || !/[^a-zA-Z0-9@#]/.test(value),
  );

export const PASSWORD_HELPER_TEXT =
  'Password must be at least 6 characters. Only @ and # are allowed as special characters.';
