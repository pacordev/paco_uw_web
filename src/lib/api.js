// Thin fetch wrapper around underwritting_api - every function here maps to exactly one
// real endpoint, no client-side business logic (same "thin API" philosophy the backend
// itself follows). Every non-2xx response is thrown as an ApiError whose `.detail` is
// always a string, no matter which layer raised it - see underwritting_api/app/main.py's
// RequestValidationError handler for why that's guaranteed.

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(status, detail) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

async function request(path, { method = "GET", body, adminKey, quoteToken } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (adminKey) headers["X-Admin-Key"] = adminKey;
  if (quoteToken) headers["X-Quote-Token"] = quoteToken;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, `Couldn't reach the API at ${BASE_URL} - is it running?`);
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    let detail = data?.detail ?? res.statusText;
    if (res.status === 429) {
      const retryAfter = res.headers.get("retry-after");
      if (retryAfter) detail = `${detail} (retry after ${retryAfter}s)`;
    }
    throw new ApiError(res.status, detail);
  }
  return data;
}

// -- public, applicant-facing --

export const getProducts = () => request("/products");

export const getProductQuestions = (code) => request(`/products/${code}/questions`);

export const createQuote = (productCode) =>
  request("/quotes", { method: "POST", body: { product_code: productCode } });

export const submitAnswers = (quoteId, quoteToken, answers) =>
  request(`/quotes/${quoteId}/answers`, { method: "POST", body: { answers }, quoteToken });

export const evaluateQuote = (quoteId, quoteToken, strategy) =>
  request(`/quotes/${quoteId}/evaluate`, { method: "POST", body: { strategy }, quoteToken });

// -- admin, behind X-Admin-Key --

export const getProductRules = (code, adminKey) =>
  request(`/products/${code}/rules`, { adminKey });

export const createProduct = (adminKey, body) =>
  request("/products", { method: "POST", body, adminKey });

export const addProductQuestion = (adminKey, code, body) =>
  request(`/products/${code}/questions`, { method: "POST", body, adminKey });

export const addProductRule = (adminKey, code, body) =>
  request(`/products/${code}/rules`, { method: "POST", body, adminKey });

export function errorMessage(err, fallback) {
  return err instanceof ApiError ? err.detail : fallback;
}
