/**
 * Operational error with an HTTP status code and optional details.
 * Thrown by models/controllers and turned into a JSON response by errorHandler.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }

  static badRequest(msg, details) { return new AppError(msg, 400, details); }
  static notFound(msg, details)   { return new AppError(msg, 404, details); }
  static conflict(msg, details)   { return new AppError(msg, 409, details); }
}

module.exports = AppError;
