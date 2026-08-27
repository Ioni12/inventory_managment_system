const BASE_URL = import.meta.env.VITE_API_URL || "/api";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  // No content (e.g. 204 on logout) — nothing to parse.
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(
      data?.error || `Request failed (${res.status})`,
      res.status,
    );
  }

  return data;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) =>
    request(path, { method: "PUT", body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: "DELETE" }),
  // For multipart file uploads (e.g. /products/import). Never set
  // Content-Type manually here — the browser must set it (with the
  // multipart boundary) itself when the body is a FormData instance.
  uploadFile: async (path, file, fieldName = "file") => {
    const formData = new FormData();
    formData.append(fieldName, file);
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      throw new ApiError(
        data?.error || `Request failed (${res.status})`,
        res.status,
      );
    }
    return data;
  },
  // Full download URL for export links/buttons — browser handles the
  // Content-Disposition attachment itself, so this is used as a plain
  // href/window.location target, not fetched and parsed as JSON.
  fileUrl: (path) => `${BASE_URL}${path}`,
};

export { ApiError };
