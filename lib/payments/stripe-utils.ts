import Stripe from 'stripe';

/**
 * Retry configuration for Stripe API calls
 */
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Exponential backoff delay calculation
 */
function getRetryDelay(attemptNumber: number): number {
  return INITIAL_RETRY_DELAY * Math.pow(2, attemptNumber);
}

/**
 * Determines if a Stripe error is retryable
 */
function isRetryableError(error: any): boolean {
  if (error instanceof Stripe.errors.StripeError) {
    // Retry on rate limit errors
    if (error.type === 'StripeRateLimitError') {
      return true;
    }
    // Retry on connection errors
    if (error.type === 'StripeConnectionError') {
      return true;
    }
    // Retry on API errors with 5xx status codes
    if (error.type === 'StripeAPIError' && error.statusCode && error.statusCode >= 500) {
      return true;
    }
  }
  return false;
}

/**
 * Wrapper for Stripe API calls with automatic retry and error handling
 */
export async function withStripeRetry<T>(
  operation: () => Promise<T>,
  context: string
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Log the error
      console.error(`Stripe API error in ${context} (attempt ${attempt + 1}/${MAX_RETRIES}):`, {
        type: error instanceof Stripe.errors.StripeError ? error.type : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof Stripe.errors.StripeError ? error.code : undefined,
        statusCode: error instanceof Stripe.errors.StripeError ? error.statusCode : undefined,
      });

      // Don't retry if it's not a retryable error
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt < MAX_RETRIES - 1) {
        const delay = getRetryDelay(attempt);
        console.log(`Retrying ${context} in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Safe Stripe meter event creation with retry
 */
export async function createMeterEvent(params: {
  eventName: string;
  customerId: string;
  value: string;
  idempotencyKey: string;
}): Promise<string | null> {
  try {
    const { stripe } = await import('./stripe');

    const meterEvent = await withStripeRetry(
      () =>
        stripe.billing.meterEvents.create(
          {
            event_name: params.eventName,
            payload: {
              stripe_customer_id: params.customerId,
              value: params.value,
            },
          },
          {
            idempotencyKey: params.idempotencyKey,
          }
        ),
      'createMeterEvent'
    );

    return meterEvent.identifier;
  } catch (error) {
    console.error('Failed to create meter event after retries:', error);
    // Return null instead of throwing to allow operation to continue
    return null;
  }
}

/**
 * Format Stripe error for user-friendly display
 */
export function formatStripeError(error: any): string {
  if (error instanceof Stripe.errors.StripeCardError) {
    return error.message || 'Your card was declined. Please try a different payment method.';
  }

  if (error instanceof Stripe.errors.StripeRateLimitError) {
    return 'Too many requests. Please try again in a moment.';
  }

  if (error instanceof Stripe.errors.StripeInvalidRequestError) {
    return 'Invalid request. Please contact support if this persists.';
  }

  if (error instanceof Stripe.errors.StripeAPIError) {
    return 'A payment processing error occurred. Please try again.';
  }

  if (error instanceof Stripe.errors.StripeConnectionError) {
    return 'Network error. Please check your connection and try again.';
  }

  if (error instanceof Stripe.errors.StripeAuthenticationError) {
    return 'Authentication error. Please contact support.';
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Log Stripe API call for monitoring
 */
export function logStripeCall(
  operation: string,
  params: any,
  result: 'success' | 'failure',
  duration: number,
  error?: any
) {
  const logData = {
    timestamp: new Date().toISOString(),
    operation,
    result,
    duration: `${duration}ms`,
    ...(error && {
      error: {
        type: error instanceof Stripe.errors.StripeError ? error.type : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        code: error instanceof Stripe.errors.StripeError ? error.code : undefined,
      },
    }),
  };

  if (result === 'success') {
    console.log('Stripe API call succeeded:', logData);
  } else {
    console.error('Stripe API call failed:', logData);
  }
}
