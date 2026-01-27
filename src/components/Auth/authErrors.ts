/**
 * Authentication error messages and validation utilities
 */

// Supabase error code to user-friendly message mapping
export const AUTH_ERROR_MESSAGES: Record<string, { title: string; description: string }> = {
  // Sign Up Errors
  email_exists: {
    title: 'Email already registered',
    description: 'This email is already associated with an account. Please sign in instead.'
  },
  weak_password: {
    title: 'Password too weak',
    description: 'Password must be at least 6 characters long.'
  },
  email_address_invalid: {
    title: 'Invalid email address',
    description: 'Please enter a valid email address.'
  },
  validation_failed: {
    title: 'Invalid input',
    description: 'Please check your email and password and try again.'
  },
  signup_disabled: {
    title: 'Sign up unavailable',
    description: 'New account registration is currently disabled. Please try again later.'
  },
  email_provider_disabled: {
    title: 'Email sign up unavailable',
    description: 'Email registration is not available at this time.'
  },

  // Sign In Errors
  invalid_credentials: {
    title: 'Invalid credentials',
    description: 'The email or password you entered is incorrect. Please try again.'
  },
  email_not_confirmed: {
    title: 'Email not verified',
    description: 'Please check your inbox and verify your email before signing in.'
  },
  user_banned: {
    title: 'Account suspended',
    description: 'Your account has been suspended. Please contact support for assistance.'
  },
  over_request_rate_limit: {
    title: 'Too many attempts',
    description: 'You have made too many attempts. Please wait a few minutes before trying again.'
  },

  // Network/General Errors
  network_error: {
    title: 'Connection failed',
    description: 'Unable to connect to the server. Please check your internet connection and try again.'
  },
  unknown: {
    title: 'Something went wrong',
    description: 'An unexpected error occurred. Please try again.'
  }
};

// Client-side validation error messages
export const VALIDATION_ERRORS = {
  email_required: 'Email address is required',
  email_invalid: 'Please enter a valid email address',
  password_required: 'Password is required',
  password_too_short: 'Password must be at least 6 characters',
  password_mismatch: 'Passwords do not match'
} as const;

// Password requirements
export const PASSWORD_REQUIREMENTS = {
  minLength: 6,
  message: 'At least 6 characters'
} as const;

/**
 * Extract error code from Supabase error
 * Supabase errors can have code in different places depending on the error type
 */
export function getSupabaseErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return 'unknown';
  }

  const err = error as { code?: string; message?: string; status?: number };

  // Check for specific error codes
  if (err.code) return err.code;

  // Check message for common patterns
  const message = err.message?.toLowerCase() || '';

  if (message.includes('email already registered') || message.includes('user already registered')) {
    return 'email_exists';
  }
  if (message.includes('invalid login credentials') || message.includes('invalid credentials')) {
    return 'invalid_credentials';
  }
  if (message.includes('email not confirmed')) {
    return 'email_not_confirmed';
  }
  if (message.includes('password') && (message.includes('weak') || message.includes('short') || message.includes('at least'))) {
    return 'weak_password';
  }
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'over_request_rate_limit';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('connection') || message.includes('failed to fetch')) {
    return 'network_error';
  }
  if (message.includes('banned') || message.includes('suspended')) {
    return 'user_banned';
  }

  return 'unknown';
}

/**
 * Get user-friendly error message from Supabase error
 */
export function getAuthErrorMessage(error: unknown): { title: string; description: string } {
  const errorCode = getSupabaseErrorCode(error);
  return AUTH_ERROR_MESSAGES[errorCode] || AUTH_ERROR_MESSAGES.unknown;
}

/**
 * Client-side email validation
 */
export function validateEmail(email: string): string | null {
  if (!email.trim()) {
    return VALIDATION_ERRORS.email_required;
  }

  // Basic email regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return VALIDATION_ERRORS.email_invalid;
  }

  return null;
}

/**
 * Client-side password validation
 */
export function validatePassword(password: string): string | null {
  if (!password) {
    return VALIDATION_ERRORS.password_required;
  }

  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    return VALIDATION_ERRORS.password_too_short;
  }

  return null;
}

/**
 * Validate password confirmation matches
 */
export function validatePasswordConfirmation(password: string, confirmPassword: string): string | null {
  if (password !== confirmPassword) {
    return VALIDATION_ERRORS.password_mismatch;
  }
  return null;
}
