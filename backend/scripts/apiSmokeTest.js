/**
 * Quick end-to-end check of every endpoint and status code.
 * Start the server first (npm start), ideally on a fresh database (npm run db:setup).
 * Usage: npm run test:api
 */
require('dotenv').config({ quiet: true });

const BASE = process.env.API_URL || `http://localhost:${process.env.PORT || 3000}`;
let passed = 0;
let failed = 0;

async function call(method, url, body) {
  const res = await fetch(BASE + url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)),
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  return { status: res.status, body: json };
}

async function expect(name, method, url, body, expectedStatus, check) {
  try {
    const res = await call(method, url, body);
    const ok = res.status === expectedStatus && (!check || check(res.body));
    if (ok) passed += 1; else failed += 1;
    console.log(`${ok ? 'PASS' : 'FAIL'}  [${res.status}] ${method} ${url} – ${name}`);
    if (!ok) console.log('      ', JSON.stringify(res.body).slice(0, 400));
    return res.body;
  } catch (err) {
    failed += 1;
    console.log(`FAIL  ${method} ${url} – ${name}: ${err.message}`);
    return null;
  }
}

async function main() {
  const stamp = Date.now().toString().slice(-6);

  // ---------- Suppliers ----------
  const sup = await expect('register supplier', 'POST', '/api/suppliers', {
    business_name: `Test Orchards ${stamp}`, contact_person: 'Test Person',
    phone: `+2782${stamp}1`, province: 'Free State', address: '1 Test Rd, Bethlehem',
  }, 201);
  const supId = sup && sup.data.supplier_id;
  await expect('invalid supplier → 400', 'POST', '/api/suppliers', { business_name: 'X', province: 'Lesotho' }, 400);
  await expect('duplicate supplier → 409', 'POST', '/api/suppliers', {
    business_name: `Test Orchards ${stamp}`, contact_person: 'Test Person',
    phone: `+2782${stamp}2`, province: 'Free State', address: '1 Test Rd, Bethlehem',
  }, 409);
  await expect('all suppliers', 'GET', '/api/suppliers', undefined, 200, (b) => b.count >= 8);
  await expect('filter by province', 'GET', '/api/suppliers?province=Limpopo', undefined, 200);
  await expect('supplier by id', 'GET', `/api/suppliers/${supId}`, undefined, 200);
  await expect('supplier not found → 404', 'GET', '/api/suppliers/99999', undefined, 404);
  await expect('bad id → 400', 'GET', '/api/suppliers/abc', undefined, 400);
  await expect('update supplier', 'PUT', `/api/suppliers/${supId}`, { contact_person: 'New Contact' }, 200,
    (b) => b.data.contact_person === 'New Contact');
  await expect('empty update → 400', 'PUT', `/api/suppliers/${supId}`, {}, 400);
  await expect('delete supplier with purchases → 409', 'DELETE', '/api/suppliers/1', undefined, 409);
  await expect('delete unused supplier', 'DELETE', `/api/suppliers/${supId}`, undefined, 200);

  // ---------- Fruits & stock ----------
  const fruit = await expect('register fruit', 'POST', '/api/fruits', {
    fruit_name: `Pears ${stamp}`, description: 'Packham pears', prices: { SMALL: 70, MEDIUM: 125, LARGE: 210 },
  }, 201, (b) => b.data.stock.length === 3);
  const fruitId = fruit && fruit.data.fruit_id;
  await expect('fruit prices must differ → 400', 'POST', '/api/fruits', {
    fruit_name: `Plums ${stamp}`, prices: { SMALL: 70, MEDIUM: 70, LARGE: 210 },
  }, 400);
  await expect('all fruits', 'GET', '/api/fruits', undefined, 200);
  await expect('available fruits', 'GET', '/api/fruits/available', undefined, 200);
  await expect('update fruit', 'PUT', `/api/fruits/${fruitId}`, { description: 'Updated' }, 200);
  await expect('stock per packaging size', 'GET', '/api/stock', undefined, 200);
  await expect('stock for apples', 'GET', '/api/stock/fruit/1', undefined, 200,
    (b) => b.data.by_packaging_size.length === 3);
  await expect('low stock (reorder level)', 'GET', '/api/stock/low', undefined, 200, (b) => b.count >= 3);
  await expect('low stock threshold=5', 'GET', '/api/stock/low?threshold=5', undefined, 200);
  await expect('update selling price', 'PUT', `/api/stock/${fruitId}/large`, { selling_price: 215 }, 200);
  await expect('price breaks size order → 400', 'PUT', `/api/stock/${fruitId}/SMALL`, { selling_price: 500 }, 400);

  // ---------- Vendors ----------
  const ven = await expect('register vendor', 'POST', '/api/vendors', {
    vendor_name: `Test Vendor ${stamp}`, phone_number: `+2665${stamp}9`, location: 'Maseru Mall',
  }, 201);
  const venId = ven && ven.data.vendor_id;
  await expect('all vendors', 'GET', '/api/vendors', undefined, 200);
  await expect('search by name', 'GET', '/api/vendors/search?q=palesa', undefined, 200, (b) => b.count === 1);
  await expect('search by phone', 'GET', '/api/vendors/search?phone=58123456', undefined, 200, (b) => b.count === 1);
  await expect('search no match → 404', 'GET', '/api/vendors/search?q=zzzzzz', undefined, 404);
  await expect('update vendor', 'PUT', `/api/vendors/${venId}`, { location: 'Pioneer Mall' }, 200);

  // ---------- Purchases ----------
  await expect('purchase (multi-item) → stock up', 'POST', '/api/purchases', {
    supplier_id: 1, purchase_date: '2026-11-15',
    items: [
      { fruit_id: fruitId, packaging_size: 'small', quantity: 20, unit_cost: 40.5 },
      { fruit_id: fruitId, packaging_size: 'LARGE', quantity: 10, unit_cost: 150 },
    ],
  }, 201, (b) => b.data.total_amount === 2310);
  await expect('purchase with new supplier details', 'POST', '/api/purchases', {
    supplier: { business_name: `Inline Supplier ${stamp}`, contact_person: 'Inline', phone: `+2783${stamp}0`, province: 'Gauteng', address: '9 Market St, Pretoria' },
    items: [{ fruit_id: fruitId, packaging_size: 'MEDIUM', quantity: 5, unit_cost: 90 }],
  }, 201);
  await expect('purchase bad fruit → 400 + rollback', 'POST', '/api/purchases', {
    supplier_id: 1, items: [{ fruit_id: fruitId, packaging_size: 'SMALL', quantity: 1, unit_cost: 1 }, { fruit_id: 9999, packaging_size: 'SMALL', quantity: 1, unit_cost: 1 }],
  }, 400);
  await expect('purchase unknown supplier → 404', 'POST', '/api/purchases', {
    supplier_id: 9999, items: [{ fruit_id: 1, packaging_size: 'SMALL', quantity: 1, unit_cost: 1 }],
  }, 404);
  await expect('pears stock after purchases', 'GET', `/api/stock/fruit/${fruitId}`, undefined, 200,
    (b) => b.data.by_packaging_size.map((r) => r.available_quantity).join(',') === '20,5,10');

  // ---------- Sales ----------
  await expect('NB: 10 LARGE apples (6 available) → 400', 'POST', '/api/sales', {
    vendor_id: 1, items: [{ fruit_id: 2, packaging_size: 'SMALL', quantity: 2 }, { fruit_id: 1, packaging_size: 'LARGE', quantity: 10 }],
  }, 400, (b) => b.errors[0].available === 6);
  await expect('stock unchanged after rejected sale', 'GET', '/api/stock/fruit/1', undefined, 200,
    (b) => b.data.by_packaging_size[2].available_quantity === 6);
  await expect('duplicate lines summed (4+4 > 6) → 400', 'POST', '/api/sales', {
    vendor_id: 1, items: [{ fruit_id: 1, packaging_size: 'LARGE', quantity: 4 }, { fruit_id: 1, packaging_size: 'LARGE', quantity: 4 }],
  }, 400);
  await expect('client-sent price refused → 400', 'POST', '/api/sales', {
    vendor_id: 1, items: [{ fruit_id: 1, packaging_size: 'LARGE', quantity: 1, unit_price: 1 }],
  }, 400);
  await expect('unregistered vendor → 404', 'POST', '/api/sales', {
    vendor_id: 9999, items: [{ fruit_id: 1, packaging_size: 'SMALL', quantity: 1 }],
  }, 404);
  const sale = await expect('multi-item sale, partial mobile money', 'POST', '/api/sales', {
    vendor_id: venId,
    items: [
      { fruit_id: fruitId, packaging_size: 'SMALL', quantity: 3 },  // 3 × 70
      { fruit_id: fruitId, packaging_size: 'LARGE', quantity: 2 },  // 2 × 215
      { fruit_id: 2, packaging_size: 'MEDIUM', quantity: 1 },       // 1 × 105
    ],
    payment: { payment_method: 'MOBILE_MONEY', amount: 400, reference_no: 'MPESA-TEST' },
  }, 201, (b) => b.data.total_amount === 745 && b.data.payment_status === 'PARTIALLY_PAID' && b.data.outstanding_balance === 345);
  const saleId = sale && sale.data.sale_id;
  await expect('credit sale → UNPAID', 'POST', '/api/sales', {
    vendor_id: venId, items: [{ fruit_id: fruitId, packaging_size: 'MEDIUM', quantity: 1 }],
    payment: { payment_method: 'CREDIT' },
  }, 201, (b) => b.data.payment_status === 'UNPAID');
  await expect('overpayment at sale → 400', 'POST', '/api/sales', {
    vendor_id: venId, items: [{ fruit_id: fruitId, packaging_size: 'SMALL', quantity: 1 }],
    payment: { payment_method: 'CASH', amount: 1000 },
  }, 400);
  await expect('sale by id', 'GET', `/api/sales/${saleId}`, undefined, 200, (b) => b.data.items.length === 3);
  await expect('sales filter UNPAID', 'GET', '/api/sales?payment_status=unpaid', undefined, 200);

  // ---------- Payments ----------
  await expect('payment exceeding balance → 400', 'POST', '/api/payments', { sale_id: saleId, amount: 999, payment_method: 'CASH' }, 400);
  await expect('cash payment clears balance', 'POST', '/api/payments', { sale_id: saleId, amount: 345, payment_method: 'cash' }, 201,
    (b) => b.data.payment_status === 'PAID' && b.data.outstanding_balance === 0);
  await expect('payment on paid sale → 400', 'POST', '/api/payments', { sale_id: saleId, amount: 1, payment_method: 'CASH' }, 400);
  await expect('CREDIT is not a payment → 400', 'POST', '/api/payments', { sale_id: 3, amount: 10, payment_method: 'CREDIT' }, 400);
  await expect('payments list', 'GET', `/api/payments?sale_id=${saleId}`, undefined, 200, (b) => b.count === 2);
  await expect('vendor balances (outstanding)', 'GET', '/api/payments/balances?outstanding=true', undefined, 200);
  await expect('one vendor balance', 'GET', `/api/vendors/${venId}/balance`, undefined, 200, (b) => b.data.outstanding_balance === 125);

  // ---------- Reports ----------
  await expect('top 5 fruits', 'GET', '/api/reports/top-fruits', undefined, 200, (b) => b.count <= 5);
  await expect('revenue Oct 2026', 'GET', '/api/reports/revenue?start=2026-10-01&end=2026-10-31', undefined, 200,
    (b) => b.data.total_revenue === 35620);
  await expect('revenue bad range → 400', 'GET', '/api/reports/revenue?start=2026-12-01&end=2026-10-01', undefined, 400);
  await expect('top vendor', 'GET', '/api/reports/top-vendor', undefined, 200);
  await expect('stock levels', 'GET', '/api/reports/stock-levels', undefined, 200);

  // ---------- Misc ----------
  await expect('fruit with history cannot be deleted → 409', 'DELETE', `/api/fruits/${fruitId}`, undefined, 409);
  await expect('malformed JSON → 400', 'POST', '/api/vendors', '{"vendor_name": ', 400);
  await expect('unknown route → 404', 'GET', '/api/nothing', undefined, 404);
  await expect('health', 'GET', '/health', undefined, 200);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}

main();
