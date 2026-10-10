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

/**
 * Ask the API for a file (an export) and save it through the browser's own download.
 * A refusal comes back in the standard error shape and is thrown like any other.
 * @param {string} path  Path under /api, e.g. "/accounts/export?industry=Steel"
 * @param {string} fallbackName  Used when the server names no file
 */
export async function apiDownload(path, fallbackName) {
  let response;
  try {
    response = await fetch(`/api${path}`, { credentials: 'same-origin' });
  } catch {
    throw toClientError('NETWORK_ERROR', 'Cannot reach the server. Check your connection.', 0);
  }
  if (!response.ok) {
    const error = (await response.json().catch(() => null))?.error;
    throw toClientError(
      error?.code ?? 'UNKNOWN_ERROR',
      error?.message ?? 'Something went wrong. Please try again.',
      response.status,
      error?.details,
      error?.requestId,
    );
  }
  const named = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') ?? '');
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = named?.[1] ?? fallbackName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function toClientError(code, message, status, details, requestId) {
  const error = new Error(message);
  error.code = code;
  error.status = status;
  error.details = details;
  error.requestId = requestId;
  return error;
}
