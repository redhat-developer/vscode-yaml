/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Red Hat, Inc. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { getRetryDelay, isRetryableError, parseRetryAfter, requestWithRetry } from '../src/schema-request-retry';

describe('Schema request retry', () => {
  const noDelay = (): Promise<void> => Promise.resolve();

  function failingThenSucceeding(
    failures: unknown[],
    result = 'schema'
  ): { request: () => Promise<string>; calls: () => number } {
    let calls = 0;
    return {
      request: async () => {
        const failure = failures[calls++];
        if (failure !== undefined) {
          throw failure;
        }
        return result;
      },
      calls: () => calls,
    };
  }

  describe('isRetryableError', () => {
    it('retries temporary HTTP statuses', () => {
      for (const status of [429, 502, 503, 504]) {
        assert.strictEqual(isRetryableError({ status }), true, `status ${status}`);
      }
    });

    it('does not retry settled HTTP statuses', () => {
      for (const status of [304, 400, 401, 403, 404, 500]) {
        assert.strictEqual(isRetryableError({ status }), false, `status ${status}`);
      }
    });

    it('retries connection level errors', () => {
      for (const code of ['ECONNRESET', 'ETIMEDOUT', 'ECONNABORTED', 'EPIPE', 'EAI_AGAIN']) {
        assert.strictEqual(isRetryableError({ code }), true, code);
      }
      assert.strictEqual(isRetryableError({ code: 'ENOTFOUND' }), false);
    });

    it('does not retry when there is nothing to inspect', () => {
      assert.strictEqual(isRetryableError(undefined), false);
      assert.strictEqual(isRetryableError({}), false);
    });
  });

  describe('parseRetryAfter', () => {
    it('reads delta-seconds', () => {
      assert.strictEqual(parseRetryAfter({ 'retry-after': '2' }, 0), 2000);
      assert.strictEqual(parseRetryAfter({ 'Retry-After': '0' }, 0), 0);
    });

    it('reads an HTTP date relative to now', () => {
      const now = Date.parse('2026-01-01T00:00:00Z');
      assert.strictEqual(parseRetryAfter({ 'retry-after': 'Thu, 01 Jan 2026 00:00:03 GMT' }, now), 3000);
      assert.strictEqual(parseRetryAfter({ 'retry-after': 'Wed, 31 Dec 2025 23:59:00 GMT' }, now), 0);
    });

    it('ignores a missing, negative or unreadable header', () => {
      assert.strictEqual(parseRetryAfter(undefined, 0), undefined);
      assert.strictEqual(parseRetryAfter({}, 0), undefined);
      assert.strictEqual(parseRetryAfter({ 'retry-after': '-5' }, 0), undefined);
      assert.strictEqual(parseRetryAfter({ 'retry-after': 'soon' }, 0), undefined);
    });
  });

  describe('getRetryDelay', () => {
    it('caps a long Retry-After at one second', () => {
      assert.strictEqual(getRetryDelay({ headers: { 'retry-after': '120' } }, 0), 1000);
    });

    it('honours a short Retry-After', () => {
      assert.strictEqual(getRetryDelay({ headers: { 'retry-after': '0' } }, 0), 0);
    });

    it('backs off exponentially without exceeding the cap', () => {
      const first = getRetryDelay({}, 0);
      assert.ok(first >= 200 && first <= 400, `first delay ${first}`);
      assert.ok(getRetryDelay({}, 10) <= 1000);
    });
  });

  describe('requestWithRetry', () => {
    it('returns straight away when the first attempt works', async () => {
      const { request, calls } = failingThenSucceeding([]);
      assert.strictEqual(await requestWithRetry(request, { delay: noDelay }), 'schema');
      assert.strictEqual(calls(), 1);
    });

    it('recovers after a temporary failure', async () => {
      const { request, calls } = failingThenSucceeding([{ status: 503 }]);
      assert.strictEqual(await requestWithRetry(request, { delay: noDelay }), 'schema');
      assert.strictEqual(calls(), 2);
    });

    it('gives up after the retry budget and rethrows the last error unchanged', async () => {
      const error = { status: 503, responseText: 'unavailable' };
      const { request, calls } = failingThenSucceeding([error, error, error, error]);
      await assert.rejects(requestWithRetry(request, { delay: noDelay }), (thrown) => thrown === error);
      assert.strictEqual(calls(), 3);
    });

    it('does not retry a settled failure', async () => {
      const error = { status: 404 };
      const { request, calls } = failingThenSucceeding([error]);
      await assert.rejects(requestWithRetry(request, { delay: noDelay }), (thrown) => thrown === error);
      assert.strictEqual(calls(), 1);
    });

    it('waits between attempts using the supplied delay', async () => {
      const waits: number[] = [];
      const { request } = failingThenSucceeding([{ status: 429, headers: { 'retry-after': '1' } }]);
      await requestWithRetry(request, {
        delay: (ms) => {
          waits.push(ms);
          return Promise.resolve();
        },
      });
      assert.deepStrictEqual(waits, [1000]);
    });

    it('honours a custom retry count', async () => {
      const { request, calls } = failingThenSucceeding([{ status: 503 }, { status: 503 }]);
      await assert.rejects(requestWithRetry(request, { delay: noDelay, maxRetries: 0 }));
      assert.strictEqual(calls(), 1);
    });
  });
});
