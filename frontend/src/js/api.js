/**
 * Small fetch wrapper for the Batloung Farm REST API.
 * Every call returns the parsed JSON body, or throws an ApiError that carries
 * the HTTP status, the server's message and its list of validation errors.
 */
(function () {
  class ApiError extends Error {
    constructor(message, status, errors) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      // Normalise errors to readable strings (server sends strings or objects)
      this.errors = (errors || []).map((e) => {
        if (typeof e === 'string') return e;
        if (e && e.reason) return e.reason;
        return JSON.stringify(e);
      });
    }
  }

  async function request(method, path, body) {
    let response;
    try {
      response = await fetch(App.config.API_BASE + path, {
        method,
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (networkError) {
      throw new ApiError(
        'Cannot reach the server. Make sure the backend is running (cd backend && npm start).',
        0,
      );
    }

    let data = null;
    try { data = await response.json(); } catch (e) { /* empty body */ }

    if (!response.ok) {
      throw new ApiError(
        (data && data.message) || `Request failed (${response.status})`,
        response.status,
        data && data.errors,
      );
    }
    return data;
  }

  App.ApiError = ApiError;
  App.api = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
    put: (path, body) => request('PUT', path, body),
    del: (path) => request('DELETE', path),

    /** Builds "?a=1&b=2" from an object, skipping empty values. */
    query(params) {
      const q = new URLSearchParams();
      Object.entries(params || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') q.append(k, v);
      });
      const s = q.toString();
      return s ? `?${s}` : '';
    },
  };
})();
