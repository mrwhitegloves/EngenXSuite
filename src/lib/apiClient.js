// The one place the browser calls the API. Every response follows the server's standard shape:
// success → { data, meta? }, failure → { error: { code, message, details?, requestId } }.

/**
 * @param {string} path  Path under /api, e.g. "/health"
 * @param {{ method?: string, body?: unknown, signal?: AbortSignal }} [options]
 * @returns {Promise<{ data: unknown, meta?: unknown }>}
 */
export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
  // A FormData body is a file upload: the browser sets its own multipart header.
  const isUpload = typeof FormData !== 'undefined' && body instanceof FormData;
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      signal,
      credentials: 'same-origin',
      headers: body === undefined || isUpload ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined || isUpload ? body : JSON.stringify(body),
    });
  } catch {
    // fetch only rejects when the network or the server is unreachable.
    throw toClientError('NETWORK_ERROR', 'Cannot reach the server. Check your connection.', 0);
  }

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = payload?.error;
    throw toClientError(
      error?.code ?? 'UNKNOWN_ERROR',
      error?.message ?? 'Something went wrong. Please try again.',
      response.status,
      error?.details,
      error?.requestId,
    );
  }
  return payload;
}

function toClientError(code, message, status, details, requestId) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.details = details;
  error.requestId = requestId;
  return error;
}
