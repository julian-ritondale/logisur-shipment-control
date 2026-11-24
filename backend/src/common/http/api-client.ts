import type { JsonObject } from '../types/json.js';

export type Fetch = (input: string, init: RequestInit) => Promise<Response>;

export interface ApiClientOptions {
  baseUrl: string;
  /** Sent with every request, e.g. an API key. */
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Defaults to the global `fetch`; tests pass a fake. */
  fetch?: Fetch;
}

export interface RequestOptions {
  query?: Record<string, string>;
  signal?: AbortSignal;
}

/** Whatever the API answered: its status and its body, as JSON when it is JSON, as text otherwise. */
export interface ApiResponse {
  status: number;
  ok: boolean;
  body: unknown;
}

const DEFAULT_TIMEOUT_MS = 10_000;
const TRAILING_SLASHES = /\/+$/;

/**
 * Base class for the clients of the third-party JSON APIs we call. A subclass
 * declares one method per endpoint and leaves the transport to this class.
 *
 * Nest has no first-party HTTP client (`@nestjs/axios` would add axios for
 * what `fetch` already does), so this is a thin layer over `fetch`: base URL,
 * default headers, JSON bodies, query strings and a per-request timeout. It
 * never interprets a status: every answer comes back as an `ApiResponse`, and
 * only a network failure or a timeout rejects.
 */
export abstract class ApiClient {
  private readonly baseUrl: string;
  private readonly fetchFn: Fetch;

  protected constructor(private readonly options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(TRAILING_SLASHES, '');
    this.fetchFn = options.fetch ?? ((input, init) => fetch(input, init));
  }

  protected get(path: string, options?: RequestOptions): Promise<ApiResponse> {
    return this.request('GET', path, undefined, options);
  }

  protected post(
    path: string,
    body: JsonObject,
    options?: RequestOptions,
  ): Promise<ApiResponse> {
    return this.request('POST', path, body, options);
  }

  private async request(
    method: string,
    path: string,
    body: JsonObject | undefined,
    { query, signal }: RequestOptions = {},
  ): Promise<ApiResponse> {
    const timeout = AbortSignal.timeout(
      this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );
    const response = await this.fetchFn(
      `${this.baseUrl}${path}${toQueryString(query)}`,
      {
        method,
        headers: {
          ...this.options.headers,
          Accept: 'application/json',
          ...(body && { 'Content-Type': 'application/json' }),
        },
        body: body && JSON.stringify(body),
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      },
    );
    return {
      status: response.status,
      ok: response.ok,
      body: await readBody(response),
    };
  }
}

/** `?a=1&b=2`, with every value percent-encoded (spaces as `%20`, not `+`). */
const toQueryString = (query: Record<string, string> = {}): string => {
  const pairs = Object.entries(query).map(
    ([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
  );
  return pairs.length > 0 ? `?${pairs.join('&')}` : '';
};

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => '');
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
