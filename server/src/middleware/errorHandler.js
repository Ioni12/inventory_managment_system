const { AppError } = require("../utils/errors");

/**
 * Centralized Express error-handling middleware. Mount this LAST, after
 * every route (`app.use(errorHandler)` at the bottom of server.js) —
 * Express only recognizes a middleware as an error handler if it takes
 * exactly 4 parameters (err, req, res, next), and error handlers only
 * catch errors that reach them via `next(err)` or a rejected promise
 * from an async route handler.
 *
 * This is the one place that decides the actual HTTP status code and
 * response shape for a thrown error — controllers just throw the right
 * kind of error (see utils/errors.js) and stop worrying about it.
 *
 * - AppError (and its subclasses: NotFoundError, ValidationError,
 *   ForbiddenError, UnauthorizedError) -> uses that error's own
 *   statusCode/code/details, response shape:
 *     { error: "<message>", code: "<CODE>", details?: {...} }
 *
 * - Anything else (a genuine bug, an unexpected crash, a raw
 *   `throw new Error(...)` that was never converted) -> logged
 *   server-side and returned as a generic 500, so internal error
 *   details (stack traces, DB error text, etc.) never leak to the
 *   client.
 */
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      ...(err.details !== undefined ? { details: err.details } : {}),
    });
  }

  // Not one of ours — an unexpected/unhandled error. Log the full
  // detail server-side (stack trace included) but keep the client
  // response generic.
  console.error(err);

  res.status(500).json({
    error: "Internal server error",
    code: "INTERNAL_ERROR",
  });
}

module.exports = errorHandler;
