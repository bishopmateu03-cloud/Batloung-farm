/**
 * Lightweight, schema-based request validation middleware.
 * Collects every problem and responds with 400 Bad Request + a list of errors.
 */
const AppError = require('../utils/AppError');

const PROVINCES = [
  'Gauteng', 'Free State', 'KwaZulu-Natal', 'Western Cape',
  'Eastern Cape', 'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape',
];
const PACKAGING_SIZES = ['SMALL', 'MEDIUM', 'LARGE'];
const FRUIT_STATUSES = ['ACTIVE', 'INACTIVE'];
const PAYMENT_METHODS = ['CASH', 'MOBILE_MONEY', 'CREDIT'];
const PHONE_REGEX = /^\+?[0-9\s-]{8,20}$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_REGEX.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** Checks one value against one rule; returns an error message or null. */
function checkField(field, value, rule) {
  if (value === undefined || value === null || value === '') {
    return rule.required ? `${field} is required` : null;
  }
  switch (rule.type) {
    case 'string':
      if (typeof value !== 'string') return `${field} must be text`;
      if (rule.min && value.trim().length < rule.min) return `${field} must be at least ${rule.min} characters`;
      if (rule.max && value.trim().length > rule.max) return `${field} must be at most ${rule.max} characters`;
      if (rule.pattern && !rule.pattern.test(value.trim())) return rule.patternMessage || `${field} has an invalid format`;
      break;
    case 'enum':
      if (!rule.values.includes(typeof value === 'string' && rule.upper ? value.toUpperCase() : value)) {
        return `${field} must be one of: ${rule.values.join(', ')}`;
      }
      break;
    case 'integer':
      if (!Number.isInteger(Number(value)) || typeof value === 'boolean') return `${field} must be a whole number`;
      if (rule.min !== undefined && Number(value) < rule.min) return `${field} must be at least ${rule.min}`;
      break;
    case 'number':
      if (typeof value === 'boolean' || Number.isNaN(Number(value))) return `${field} must be a number`;
      if (rule.positive && Number(value) <= 0) return `${field} must be greater than 0`;
      if (rule.min !== undefined && Number(value) < rule.min) return `${field} must be at least ${rule.min}`;
      if (!/^-?\d+(\.\d{1,2})?$/.test(String(value))) return `${field} may have at most 2 decimal places`;
      break;
    case 'date':
      if (!isValidDate(value)) return `${field} must be a valid date in YYYY-MM-DD format`;
      break;
    default:
      break;
  }
  return null;
}

/**
 * Builds middleware that validates req.body against a schema.
 * partial = true (for PUT/PATCH) means no field is required, but at least one must be sent.
 */
function validateBody(schema, { partial = false } = {}) {
  return (req, res, next) => {
    const body = req.body || {};
    const errors = [];

    if (typeof body !== 'object' || Array.isArray(body)) {
      return next(AppError.badRequest('Request body must be a JSON object'));
    }

    if (partial) {
      const provided = Object.keys(schema).filter((k) => body[k] !== undefined);
      if (provided.length === 0) {
        errors.push(`Provide at least one of: ${Object.keys(schema).join(', ')}`);
      }
    }

    for (const [field, rule] of Object.entries(schema)) {
      const effectiveRule = partial ? { ...rule, required: false } : rule;
      const message = checkField(field, body[field], effectiveRule);
      if (message) errors.push(message);
    }

    if (errors.length) return next(AppError.badRequest('Validation failed', errors));
    return next();
  };
}

/** Validates a positive integer route parameter such as :id. */
function validateIdParam(paramName = 'id') {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!/^\d+$/.test(value) || Number(value) < 1) {
      return next(AppError.badRequest(`${paramName} must be a positive whole number`));
    }
    return next();
  };
}

/**
 * Validates an array of line items (purchases and sales).
 * mode = 'purchase' requires unit_cost; mode = 'sale' must NOT send a price
 * (the selling price is looked up from stock automatically).
 */
function validateItems(mode) {
  return (req, res, next) => {
    const { items } = req.body || {};
    const errors = [];

    if (!Array.isArray(items) || items.length === 0) {
      return next(AppError.badRequest('Validation failed', ['items must be a non-empty array']));
    }

    items.forEach((item, i) => {
      const prefix = `items[${i}]`;
      if (!item || typeof item !== 'object') {
        errors.push(`${prefix} must be an object`);
        return;
      }
      const fieldRules = {
        fruit_id: { type: 'integer', required: true, min: 1 },
        packaging_size: { type: 'enum', required: true, values: PACKAGING_SIZES, upper: true },
        quantity: { type: 'integer', required: true, min: 1 },
      };
      if (mode === 'purchase') fieldRules.unit_cost = { type: 'number', required: true, positive: true };

      for (const [field, rule] of Object.entries(fieldRules)) {
        const message = checkField(`${prefix}.${field}`, item[field], rule);
        if (message) errors.push(message);
      }
      if (mode === 'sale' && (item.unit_price !== undefined || item.line_total !== undefined)) {
        errors.push(`${prefix}: do not send unit_price/line_total – prices are calculated automatically`);
      }
    });

    if (errors.length) return next(AppError.badRequest('Validation failed', errors));

    // Normalise packaging size to upper-case and numbers to Number
    req.body.items = items.map((item) => ({
      ...item,
      fruit_id: Number(item.fruit_id),
      quantity: Number(item.quantity),
      packaging_size: String(item.packaging_size).toUpperCase(),
      ...(mode === 'purchase' ? { unit_cost: Number(item.unit_cost) } : {}),
    }));
    return next();
  };
}

// ----------------------- Resource schemas -----------------------

const supplierSchema = {
  business_name: { type: 'string', required: true, min: 2, max: 120 },
  contact_person: { type: 'string', required: true, min: 2, max: 100 },
  phone: { type: 'string', required: true, pattern: PHONE_REGEX, patternMessage: 'phone must contain 8–20 digits (optionally starting with +)' },
  province: { type: 'enum', required: true, values: PROVINCES },
  address: { type: 'string', required: true, min: 5, max: 255 },
};

const fruitSchema = {
  fruit_name: { type: 'string', required: true, min: 2, max: 50 },
  description: { type: 'string', required: false, max: 255 },
  status: { type: 'enum', required: false, values: FRUIT_STATUSES, upper: true },
};

const vendorSchema = {
  vendor_name: { type: 'string', required: true, min: 2, max: 100 },
  phone_number: { type: 'string', required: true, pattern: PHONE_REGEX, patternMessage: 'phone_number must contain 8–20 digits (optionally starting with +)' },
  location: { type: 'string', required: true, min: 2, max: 150 },
  registration_date: { type: 'date', required: false },
};

/** Extra checks for registering a fruit: one selling price per packaging size. */
function validateFruitPrices({ required = true } = {}) {
  return (req, res, next) => {
    const { prices, reorder_level: reorderLevel } = req.body || {};
    const errors = [];

    if (prices === undefined) {
      if (required) errors.push('prices is required, e.g. { "SMALL": 80, "MEDIUM": 140, "LARGE": 230 }');
    } else if (typeof prices !== 'object' || Array.isArray(prices) || prices === null) {
      errors.push('prices must be an object with SMALL, MEDIUM and LARGE selling prices');
    } else {
      PACKAGING_SIZES.forEach((size) => {
        const msg = checkField(`prices.${size}`, prices[size], { type: 'number', required: true, positive: true });
        if (msg) errors.push(msg);
      });
      if (!errors.length) {
        const [s, m, l] = PACKAGING_SIZES.map((size) => Number(prices[size]));
        if (!(s < m && m < l)) {
          errors.push('Each packaging size needs a different selling price: SMALL < MEDIUM < LARGE');
        }
      }
    }
    if (reorderLevel !== undefined) {
      const msg = checkField('reorder_level', reorderLevel, { type: 'integer', min: 0 });
      if (msg) errors.push(msg);
    }

    if (errors.length) return next(AppError.badRequest('Validation failed', errors));
    return next();
  };
}

/** Optional payment block on a new sale + body of POST /api/payments. */
function validatePayment({ requireSaleId = false } = {}) {
  return (req, res, next) => {
    const body = req.body || {};
    const errors = [];
    const source = requireSaleId ? body : body.payment;

    if (requireSaleId) {
      const m = checkField('sale_id', body.sale_id, { type: 'integer', required: true, min: 1 });
      if (m) errors.push(m);
    }

    if (source !== undefined) {
      if (typeof source !== 'object' || source === null) {
        errors.push('payment must be an object');
      } else {
        const methodMsg = checkField('payment_method', source.payment_method,
          { type: 'enum', required: true, values: requireSaleId ? ['CASH', 'MOBILE_MONEY'] : PAYMENT_METHODS, upper: true });
        if (methodMsg) errors.push(methodMsg);

        const method = String(source.payment_method || '').toUpperCase();
        if (method === 'CREDIT') {
          if (source.amount !== undefined && Number(source.amount) !== 0) {
            errors.push('amount must be 0 or omitted for CREDIT (outstanding) sales');
          }
        } else {
          const amtMsg = checkField('amount', source.amount, { type: 'number', required: true, positive: true });
          if (amtMsg) errors.push(amtMsg);
        }
        if (source.payment_date !== undefined) {
          const dMsg = checkField('payment_date', source.payment_date, { type: 'date' });
          if (dMsg) errors.push(dMsg);
        }
      }
    }

    if (errors.length) return next(AppError.badRequest('Validation failed', errors));
    return next();
  };
}

/** ?start=YYYY-MM-DD&end=YYYY-MM-DD */
function validateDateRange(req, res, next) {
  const { start, end } = req.query;
  const errors = [];
  if (!isValidDate(start)) errors.push('start query parameter is required (YYYY-MM-DD)');
  if (!isValidDate(end)) errors.push('end query parameter is required (YYYY-MM-DD)');
  if (!errors.length && start > end) errors.push('start date must be on or before end date');
  if (errors.length) return next(AppError.badRequest('Validation failed', errors));
  return next();
}

module.exports = {
  PROVINCES,
  PACKAGING_SIZES,
  validateBody,
  validateIdParam,
  validateItems,
  validateFruitPrices,
  validatePayment,
  validateDateRange,
  isValidDate,
  schemas: { supplierSchema, fruitSchema, vendorSchema },
};
