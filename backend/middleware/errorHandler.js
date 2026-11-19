/**
 * Central error handling middleware.
 * Converts AppErrors and MySQL errors into consistent JSON responses with
 * appropriate HTTP status codes. Internal details are hidden in production.
 */
const AppError = require('../utils/AppError');
const { describeDbError } = require('../config/db');

const DB_CONNECTION_CODES = new Set([
  'ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ENOTFOUND',
  'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST', 'ER_CON_COUNT_ERROR', 'ECONNRESET',
]);

function mapMysqlError(err) {
  if (DB_CONNECTION_CODES.has(err.code)) {
    return new AppError(`Database unavailable: ${describeDbError(err)}`, 503);
  }
  switch (err.code) {
    case 'ER_DUP_ENTRY': {
      const match = /for key '(?:[^.']+\.)?([^']+)'/.exec(err.sqlMessage || '');
      return AppError.conflict('A record with the same unique value already exists', match ? [`Duplicate value violates ${match[1]}`] : undefined);
    }
    case 'ER_NO_REFERENCED_ROW':
    case 'ER_NO_REFERENCED_ROW_2':
      return AppError.badRequest('Referenced record does not exist (foreign key constraint)');
    case 'ER_ROW_IS_REFERENCED':
    case 'ER_ROW_IS_REFERENCED_2':
      return AppError.conflict('Record cannot be deleted because other records depend on it');
    case 'ER_CHECK_CONSTRAINT_VIOLATED': // MySQL 8
    case 'ER_CONSTRAINT_FAILED':         // MariaDB
      return AppError.badRequest('Value violates a database rule (CHECK constraint)', [err.sqlMessage]);
    case 'ER_TRUNCATED_WRONG_VALUE':
    case 'ER_WARN_DATA_OUT_OF_RANGE':
    case 'WARN_DATA_TRUNCATED':
    case 'ER_DATA_TOO_LONG':
      return AppError.badRequest('Invalid value for a database field', [err.sqlMessage]);
    default:
      return null;
  }
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    err = AppError.badRequest('Malformed JSON in request body');
  }

  let error = err instanceof AppError ? err : mapMysqlError(err);

  if (!error) {
    console.error('[error]', err);
    error = new AppError('An unexpected server error occurred', 500);
  } else if (error.statusCode >= 500) {
    console.error('[error]', error.message);
  }

  const body = {
    success: false,
    status: error.statusCode,
    message: error.message,
  };
  if (error.details) body.errors = error.details;
  if (process.env.NODE_ENV === 'development' && error.statusCode === 500 && err.stack) {
    body.stack = err.stack.split('\n').slice(0, 5);
  }

  res.status(error.statusCode).json(body);
}

module.exports = errorHandler;
