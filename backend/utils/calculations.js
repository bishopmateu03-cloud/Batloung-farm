/**
 * PART D – Automatic sales / purchase calculations.
 * All money is handled in cents internally to avoid floating-point errors
 * (e.g. 0.1 + 0.2 !== 0.3), then converted back to Maloti with 2 decimals.
 */

const toCents = (amount) => Math.round(Number(amount) * 100);
const fromCents = (cents) => Math.round(cents) / 100;

/** quantity × unit price for one line item. */
function calculateLineTotal(quantity, unitPrice) {
  return fromCents(Number(quantity) * toCents(unitPrice));
}

/**
 * Calculates the total for many items, each with its own packaging size and price.
 * @param {Array<{quantity:number, unit_price?:number, unit_cost?:number}>} items
 * @returns {{ items: Array, total: number }}
 */
function calculateTotal(items, priceField = 'unit_price') {
  let totalCents = 0;
  const lines = items.map((item) => {
    const lineCents = Number(item.quantity) * toCents(item[priceField]);
    totalCents += lineCents;
    return { ...item, line_total: fromCents(lineCents) };
  });
  return { items: lines, total: fromCents(totalCents) };
}

/** Sales total payable by the vendor (unit_price taken from stock per packaging size). */
const calculateSaleTotal = (items) => calculateTotal(items, 'unit_price');

/** Purchase total owed to the supplier (unit_cost supplied per line). */
const calculatePurchaseTotal = (items) => calculateTotal(items, 'unit_cost');

/** PAID / PARTIALLY_PAID / UNPAID based on amount paid vs. total. */
function determinePaymentStatus(totalAmount, amountPaid) {
  const total = toCents(totalAmount);
  const paid = toCents(amountPaid);
  if (paid <= 0) return 'UNPAID';
  if (paid >= total) return 'PAID';
  return 'PARTIALLY_PAID';
}

/** Outstanding balance, never below zero. */
function calculateOutstanding(totalAmount, amountPaid) {
  return fromCents(Math.max(0, toCents(totalAmount) - toCents(amountPaid)));
}

module.exports = {
  toCents,
  fromCents,
  calculateLineTotal,
  calculateSaleTotal,
  calculatePurchaseTotal,
  determinePaymentStatus,
  calculateOutstanding,
};
