/**
 * PART D – Transaction demonstration (BEGIN / COMMIT / ROLLBACK).
 * Usage: npm run demo:transaction
 *
 *  Demo 1: sale with 2 items – 5 SMALL bananas (OK) + 10 LARGE apples (only 6 in stock)
 *          → whole sale rejected, stock unchanged, no sale row created.
 *  Demo 2: purchase with 2 items where the second fruit does not exist → ROLLBACK.
 *  Demo 3: valid multi-item sale → COMMIT, stock reduced.
 */
require('dotenv').config({ quiet: true });
const { pool, testConnection } = require('../config/db');
const Sale = require('../models/saleModel');
const Purchase = require('../models/purchaseModel');

async function snapshot(label) {
  const [stock] = await pool.query(
    `SELECT f.fruit_name, st.packaging_size, st.available_quantity
     FROM stock st JOIN fruits f ON f.fruit_id = st.fruit_id
     WHERE (st.fruit_id, st.packaging_size) IN ((1,'LARGE'),(2,'SMALL'),(3,'MEDIUM'))
     ORDER BY st.fruit_id`,
  );
  const [[counts]] = await pool.query(
    'SELECT (SELECT COUNT(*) FROM sales) AS sales, (SELECT COUNT(*) FROM purchases) AS purchases',
  );
  console.log(`\n--- ${label} ---`);
  console.table(stock);
  console.log(`sales rows: ${counts.sales}, purchase rows: ${counts.purchases}`);
}

async function main() {
  if (!(await testConnection())) { process.exitCode = 1; return; }
  try {
    await snapshot('BEFORE');

    console.log('\nDEMO 1: Sale → 5 SMALL bananas + 10 LARGE apples (only 6 available)');
    try {
      await Sale.create({
        vendor_id: 1,
        items: [
          { fruit_id: 2, packaging_size: 'SMALL', quantity: 5 },
          { fruit_id: 1, packaging_size: 'LARGE', quantity: 10 },
        ],
        payment: { payment_method: 'CASH', amount: 300 },
      });
    } catch (err) {
      console.log(`ROLLBACK ✔  ${err.statusCode} – ${err.message}`);
      console.log(err.details);
    }
    await snapshot('AFTER DEMO 1 (nothing changed)');

    console.log('\nDEMO 2: Purchase → 10 MEDIUM oranges + fruit 999 (does not exist)');
    try {
      await Purchase.create({
        supplier_id: 3,
        items: [
          { fruit_id: 3, packaging_size: 'MEDIUM', quantity: 10, unit_cost: 85 },
          { fruit_id: 999, packaging_size: 'SMALL', quantity: 5, unit_cost: 40 },
        ],
      });
    } catch (err) {
      console.log(`ROLLBACK ✔  ${err.statusCode} – ${err.message}`);
      console.log(err.details);
    }
    await snapshot('AFTER DEMO 2 (nothing changed)');

    console.log('\nDEMO 3: Sale → 5 SMALL bananas + 4 LARGE apples, M500 mobile money');
    const sale = await Sale.create({
      vendor_id: 1,
      items: [
        { fruit_id: 2, packaging_size: 'SMALL', quantity: 5 },
        { fruit_id: 1, packaging_size: 'LARGE', quantity: 4 },
      ],
      payment: { payment_method: 'MOBILE_MONEY', amount: 500, reference_no: 'MPESA-DEMO' },
    });
    console.log(`COMMIT ✔  sale ${sale.sale_id}: total M${sale.total_amount} (5×60 + 4×240), paid M${sale.amount_paid}, ` +
      `status ${sale.payment_status}, outstanding M${sale.outstanding_balance}`);
    await snapshot('AFTER DEMO 3 (stock reduced)');
  } finally {
    await pool.end();
  }
}

main();
