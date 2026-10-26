/**
 * Lets any layer (service/controller) throw an error carrying the
 * correct HTTP status code, so a single error middleware can format
 * every response the same way. This is part of what makes the API
 * Richardson Maturity Model Level 2: real, meaningful HTTP status codes.
 */
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }

  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, message);
  }

  static badGateway(message = 'Upstream service error') {
    return new ApiError(502, message);
  }

  static unavailable(message = 'Service unavailable') {
    return new ApiError(503, message);
  }
}

module.exports = ApiError;
