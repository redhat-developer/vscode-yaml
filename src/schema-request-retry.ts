/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/** HTTP statuses that mean "try again shortly". Any other status is a settled answer and is never retried. */
const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);

/** Connection level failures that are worth another attempt. */
const RETRYABLE_ERROR_CODES = new Set(['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'EPIPE', 'EAI_AGAIN']);

/** Additional attempts made after the first request fails. */
const MAX_RETRIES = 2;

/** Base delay for exponential backoff, in milliseconds. */
const BASE_RETRY_DELAY_MS = 200;

/**
 * Upper bound for a single delay, in milliseconds. It also caps `Retry-After`, which servers sometimes give in
 * minutes. Schema loading blocks validation, so waiting must not become noticeable while editing.
 */
const MAX_RETRY_DELAY_MS = 1000;

/** The parts of a failed request that decide whether to retry. */
export interface RetryableError {
  status?: number;
  code?: string;
  headers?: Record<string, string>;
}

/** Overrides for the retry behaviour, meant for tests. */
export interface RetryOptions {
  /** Additional attempts made after the first request fails. */
  maxRetries?: number;
  /** Replaces the real wait, so tests do not sleep through the backoff. */
  delay?: (ms: number) => Promise<void>;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Decide whether a failed request is worth repeating.
 * @param error the rejection from the request
 * @returns true when the failure looks temporary
 */
export function isRetryableError(error: RetryableError | undefined): boolean {
  if (error?.code && RETRYABLE_ERROR_CODES.has(error.code)) {
    return true;
  }
  // Connection failures can show up as status 0 or 404 with no real response, so only an explicitly retryable status
  // counts.
  return typeof error?.status === 'number' && RETRYABLE_STATUS_CODES.has(error.status);
}

/**
 * Parse a `Retry-After` header, which is either a number of seconds or an HTTP date.
 * @param headers the response headers, if there were any
 * @param now the current time in milliseconds, used to measure an HTTP date
 * @returns the delay in milliseconds, or undefined when the header is missing or unreadable
 */
export function parseRetryAfter(headers: Record<string, string> | undefined, now: number): number | undefined {
  const value = headers?.['retry-after'] ?? headers?.['Retry-After'];
  if (!value) {
    return undefined;
  }
  const seconds = Number(value);
  if (!Number.isNaN(seconds)) {
    return seconds >= 0 ? seconds * 1000 : undefined;
  }
  const date = Date.parse(value);
  return Number.isNaN(date) ? undefined : Math.max(0, date - now);
}

/**
 * Work out how long to wait before the next attempt. A server supplied `Retry-After` wins. Otherwise back off
 * exponentially with jitter, so several schemas failing together do not retry in lockstep. The result is capped.
 * @param error the rejection from the request
 * @param attempt the zero based index of the attempt that just failed
 * @returns how long to wait, in milliseconds
 */
export function getRetryDelay(error: RetryableError | undefined, attempt: number): number {
  const retryAfter = parseRetryAfter(error?.headers, Date.now());
  if (retryAfter !== undefined) {
    return Math.min(retryAfter, MAX_RETRY_DELAY_MS);
  }
  const backoff = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * BASE_RETRY_DELAY_MS;
  return Math.min(backoff + jitter, MAX_RETRY_DELAY_MS);
}

/**
 * Run a request, retrying a small number of times when it fails for a temporary reason. A failure that is not
 * retryable, or one that uses up the retries, is rethrown unchanged.
 * @param request sends one attempt
 * @param options overrides for the retry behaviour, used by tests
 * @returns whatever the successful attempt returns
 */
export async function requestWithRetry<T>(request: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const maxRetries = options.maxRetries ?? MAX_RETRIES;
  const delay = options.delay ?? sleep;
  for (let attempt = 0; ; attempt++) {
    try {
      return await request();
    } catch (error) {
      if (attempt >= maxRetries || !isRetryableError(error as RetryableError)) {
        throw error;
      }
      await delay(getRetryDelay(error as RetryableError, attempt));
    }
  }
}
