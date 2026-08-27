const TOKEN_KEY = "timemagic.startupToken";

function readStartupToken(): string {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const fragmentToken = fragment.get("token");

  if (fragmentToken) {
    window.sessionStorage.setItem(TOKEN_KEY, fragmentToken);
    window.history.replaceState(null, "", window.location.pathname);
    return fragmentToken;
  }

  return (
    window.sessionStorage.getItem(TOKEN_KEY) ??
    (import.meta.env.DEV ? "timemagic-dev" : "")
  );
}

const startupToken = readStartupToken();

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly messageKey: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(messageKey);
  }
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${startupToken}`,
      "content-type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let code = "UNKNOWN_ERROR";
    let messageKey = "server.unexpected";
    let details: Record<string, unknown> | undefined;

    try {
      const payload = (await response.json()) as {
        error?: {
          code?: string;
          details?: Record<string, unknown>;
          messageKey?: string;
        };
      };
      code = payload.error?.code ?? code;
      messageKey = payload.error?.messageKey ?? messageKey;
      details = payload.error?.details;
    } catch {
      // Non-JSON error bodies (proxies, gateway HTML) carry no structured code.
    }

    throw new ApiClientError(response.status, code, messageKey, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
