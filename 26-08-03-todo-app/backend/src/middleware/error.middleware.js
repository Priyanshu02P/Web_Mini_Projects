const ApiError = require('../utils/apiError');

function notFoundHandler(req, res, next) {
  next(ApiError.notFound(`No route for ${req.method} ${req.originalUrl}`));
}

/**
 * Converts a Mongoose ValidationError (thrown by schema `required`/`enum`/
 * `minlength`/etc. validators on .save()) into a flat, structured details
 * array instead of letting the raw Mongoose error object reach the client.
 */
function formatMongooseValidationError(err) {
  const details = Object.values(err.errors).map((fieldErr) => ({
    field: fieldErr.path,
    message: fieldErr.message,
  }));
  return { status: 400, message: 'Validation failed', details };
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Mongoose schema validation errors (required/enum/minlength/etc).
  if (err.name === 'ValidationError' && err.errors) {
    const body = formatMongooseValidationError(err);
    return res.status(body.status).json({ error: body });
  }

  // Malformed ObjectId reaching Mongoose directly (defensive - most routes
  // already guard this themselves and turn it into ApiError.notFound first).
  if (err.name === 'CastError') {
    return res.status(404).json({
      error: { status: 404, message: 'Resource not found' },
    });
  }

  // Duplicate key (e.g. unique email) from MongoDB itself.
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      error: {
        status: 409,
        message: `${field} already in use`,
        details: err.keyValue,
      },
    });
  }

  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const message = statusCode === 500 ? 'Internal server error' : err.message;

  if (statusCode === 500) {
    // Log full detail server-side only; never leak internals to the client.
    console.error(err);
  }

  res.status(statusCode).json({
    error: {
      status: statusCode,
      message,
      ...(err.details ? { details: err.details } : {}),
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
