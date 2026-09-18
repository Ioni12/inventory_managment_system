/**
 * Custom error classes for structured, consistent API error responses.
 *
 * Controllers should `throw` these instead of manually calling
 * `res.status(...).json(...)` inside a catch block. The shared
 * errorHandler middleware (see middleware/errorHandler.js) catches
 * them and builds the actual HTTP response — one place decides the
 * status code and response shape, instead of every controller
 * hand-picking its own.
 *
 * Every AppError produces a response shaped like:
 *   { error: "<message>", code: "<MACHINE_READABLE_CODE>", details?: {...} }
 *
 * `code` lets the frontend branch on the *kind* of failure without
 * parsing the human-readable message string. `details` is optional,
 * structured extra context (e.g. { requested, available }) for cases
 * where the frontend can do something useful with specifics.
 */

class AppError extends Error {
  constructor(message, statusCode, code, details) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/** The requested resource doesn't exist. Maps to HTTP 404. */
class NotFoundError extends AppError {
  constructor(message = "Not found", code = "NOT_FOUND", details) {
    super(message, 404, code, details);
  }
}

/**
 * The request is malformed or violates a business rule (missing
 * field, insufficient stock, invalid row, bad input, etc.). This is
 * the "the caller needs to fix something" bucket. Maps to HTTP 400.
 */
class ValidationError extends AppError {
  constructor(message = "Invalid request", code = "VALIDATION_ERROR", details) {
    super(message, 400, code, details);
  }
}

/** Authenticated, but not allowed to do this. Maps to HTTP 403. */
class ForbiddenError extends AppError {
  constructor(message = "Forbidden", code = "FORBIDDEN", details) {
    super(message, 403, code, details);
  }
}

/** Not authenticated at all. Maps to HTTP 401. */
class UnauthorizedError extends AppError {
  constructor(message = "Not authenticated", code = "UNAUTHORIZED", details) {
    super(message, 401, code, details);
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  UnauthorizedError,
};
