# Batloung Farm – Fresh Produce Distribution Management System

A web-based distribution management system for Batloung Farm (Maseru, Lesotho): a React landing page, HTML/CSS/JavaScript admin pages (`frontend/`) and a REST API with a MySQL database (`backend/`). An administrator can use it to manage suppliers, fruits, vendors, purchases, sales, stock and vendor payments.

**Tech stack:** React, esbuild, HTML5, CSS3 and JavaScript (frontend); Node.js 18+, Express 5, MySQL 8 (or MariaDB 10.4+), `mysql2/promise`, `dotenv`.
All amounts are in Maloti (M).

---

## 1. Setup

```bash
# 1. From the project folder, install dependencies
npm install
npm run install:frontend
npm run install:backend

# 2. Configure environment
cp backend/.env.example backend/.env  # then put your MySQL user/password in backend/.env

# 3. Create the database, 9 tables and sample data
npm run db:setup              # or: mysql -u root -p < backend/database/schema.sql

# 4. Start the API and frontend together
npm run dev
```

Open the URL printed in the terminal. The React landing page links to the admin dashboard. `npm start` builds the frontend and starts the API for production use.

* The backend serves the built React entry and existing admin pages. If port 3000 is occupied, it tries the next 20 ports and prints the URL it uses.
* You can also open the frontend with VS Code Live Server. It finds the API at `http://localhost:3000` automatically, as long as the backend is running. To change that address, edit `frontend/src/js/config.js`.
* You can run `npm run dev` from the project folder or `frontend/src`; both start the API and frontend.

Optional checks (from the project folder):
```bash
npm run test:api              # 60 end-to-end API checks (run on a fresh db:setup)
npm run demo:transaction      # BEGIN / COMMIT / ROLLBACK demonstration
```

> `npm run db:setup` **drops and recreates** `batloung_farm_db`. Run it again whenever you want clean sample data.

---

## 2. Project structure

```
batloung-farm-dms/
├── package.json                     Shortcut scripts that run the backend
├── README.md
│
├── frontend/                        React landing page + HTML/CSS/JavaScript admin pages
│   ├── package.json                 React and esbuild scripts/dependencies
│   ├── index.html                   React entry document
│   ├── scripts/build.js             Builds the React bundle for Express to serve
│   └── src/
│       ├── App.jsx                  Landing page and API/database status
│       ├── main.jsx                 React entry point
│       ├── css/
│       │   ├── main.css             Colours, layout, sidebar, responsive + print rules
│       │   ├── components.css       Buttons, forms, tables, badges, modal, toast
│       │   └── dashboard.css        KPI cards, bar charts, stock matrix
│       ├── dashboards/
│       │   └── admin-dashboard.html Overview: KPIs, stock by size, low stock, sales, credit
│       ├── pages/
│       │   ├── fruits.html          Register / edit / activate / delete fruits
│       │   ├── stock.html           Stock per packaging size, low stock, prices
│       │   ├── purchases.html       Record multi-item purchases (stock goes up)
│       │   ├── suppliers.html       Supplier CRUD
│       │   ├── sales.html           Record multi-item sales (stock goes down)
│       │   ├── vendors.html         Register, search, edit, view balance
│       │   ├── payments.html        Cash / mobile money payments, outstanding credit
│       │   └── reports.html         The 4 required reports (printable)
│       ├── components/              Reusable UI: sidebar, modal, table, toast, lineItems
│       ├── js/
│       │   ├── config.js            API address
│       │   ├── api.js               fetch wrapper + ApiError
│       │   ├── utils.js             Money/date formatting, helpers
│       │   └── pages/               One script per page
│       └── assets/images/logo.svg
│
└── backend/                         Node.js + Express + MySQL
    ├── database/
    │   ├── schema.sql               PART A – database, tables, constraints, sample data
    │   ├── reports.sql              PART D – the four reporting queries
    │   └── transaction_demo.sql     PART D – SQL-level BEGIN/COMMIT/ROLLBACK demo
    ├── config/db.js                 MySQL connection pool, connection test, readable DB errors
    ├── routes/                      One router per resource (index.js mounts them under /api)
    ├── controllers/                 Request handling, async/await + try/catch, HTTP status codes
    ├── models/                      All SQL queries (parameterised) and transactions
    ├── middleware/                  validate.js, errorHandler.js, notFound.js
    ├── utils/                       calculations.js, transaction.js, AppError.js, sqlHelpers.js
    ├── scripts/                     setupDatabase.js, demoTransaction.js, apiSmokeTest.js
    ├── app.js                       Express app – serves /api and the frontend folder
    ├── server.js                    Starts the server; keeps running if MySQL is down
    ├── .env.example                 Environment variable template (.env is git-ignored)
    └── package.json
```

### Frontend features
| Page | What the administrator can do |
|---|---|
| Dashboard | See boxes in stock, low-stock count, revenue this month and outstanding credit; a fruit × packaging-size stock grid (low cells in red); low-stock alerts; recent sales; top vendor; top 5 fruits; vendors who owe money |
| Fruits | Register a fruit with Small, Medium and Large selling prices; edit; activate or deactivate; delete (blocked if the fruit has history) |
| Stock levels | View stock per size, filter by size, show low stock only (by reorder level or a custom threshold), and change prices or reorder levels |
| Purchases | Record a purchase with any number of fruit lines. The total updates as you type, and you can register a new supplier in the same form. View purchase details |
| Suppliers | Register, edit, filter by province, and delete (refused when the supplier has purchases) |
| Sales | Pick a registered vendor and add fruit lines. Prices fill in automatically and each line shows available stock, with a live total. Pay by cash, mobile money or credit. View an invoice with its payments |
| Vendors | Register, search by name or phone as you type, edit, open the vendor's account balance, or start a new sale for them |
| Payments & credit | Outstanding balance per vendor; record cash or mobile money payments against open sales; payment history |
| Reports | Top fruits, revenue for any date range, top vendor, and current stock levels, with a print button |

Errors from the API, such as *"Insufficient stock: requested 10 LARGE box(es) of Apples, only 6 available"*, appear inside the form so the administrator can fix the entry and try again.

---

## 3. Database design (PART A)

Database: **`batloung_farm_db`**

| Table | Key points |
|---|---|
| `suppliers` | PK `supplier_id`; UNIQUE business name and phone; `province` ENUM of SA provinces |
| `fruits` | PK `fruit_id`; UNIQUE `fruit_name`; `status` ACTIVE/INACTIVE |
| `vendors` | PK `vendor_id`; UNIQUE `phone_number`; `registration_date` defaults to today |
| `purchases` | PK `purchase_id`; FK → suppliers (RESTRICT); `total_amount` ≥ 0 |
| `purchase_details` | FK → purchases (CASCADE) and fruits; `quantity` > 0, `unit_cost` > 0; generated `line_total` |
| `sales` | FK → vendors; `payment_status` PAID / PARTIALLY_PAID / UNPAID; `amount_paid` ≤ `total_amount` |
| `sales_details` | FK → sales (CASCADE) and fruits; `quantity` > 0; generated `line_total` |
| `stock` | **one row per fruit per packaging size** — `UNIQUE (fruit_id, packaging_size)`, `available_quantity` ≥ 0 (CHECK), and its own `selling_price` and `reorder_level` |
| `payments` *(extra)* | FK → sales; `payment_method` CASH / MOBILE_MONEY; `amount` > 0 |

**Stock by packaging size.** Stock is never stored as one total per fruit. Each fruit has three stock rows (SMALL, MEDIUM, LARGE). Each row has its own balance and its own selling price. The composite UNIQUE key stops duplicate rows from being created. The `CHECK (available_quantity >= 0)` constraint makes negative stock impossible, even at database level.

**Sample data.** The script loads 8 suppliers (one per province), 5 fruits, 6 vendors, 15 stock rows, 5 purchases (16 lines), 7 sales (13 lines) and 6 payments. Stock is calculated as *purchased − sold*, so the data is consistent. **Apples LARGE = 6 boxes**, which matches the brief's example. Mangoes LARGE (5) and Grapes LARGE (2) show up as low stock.

---

## 4. API reference (PART C)

Every response has this shape: `{ "success": true|false, "message"?, "count"?, "data"? , "errors"? }`

| Status | When |
|---|---|
| 200 OK | Successful retrieval, update or delete |
| 201 Created | Supplier, fruit, vendor, purchase, sale or payment created |
| 400 Bad Request | Validation failed, insufficient stock, overpayment, malformed JSON |
| 404 Not Found | Record or route does not exist |
| 409 Conflict | Duplicate unique value; deleting a supplier/fruit that has history |
| 500 Internal Server Error | Unexpected error (logged; no stack trace outside development) |
| 503 Service Unavailable | MySQL unreachable (the server itself keeps running) |

### Suppliers
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/suppliers` | Register a supplier |
| GET | `/api/suppliers?province=Limpopo` | All suppliers (optional province filter) |
| GET | `/api/suppliers/:id` | Supplier by ID |
| PUT | `/api/suppliers/:id` | Update any supplier fields |
| DELETE | `/api/suppliers/:id` | Delete — **refused (409) if the supplier has purchases** |

```json
POST /api/suppliers
{ "business_name": "Hoedspruit Mango Estates", "contact_person": "Johan Pretorius",
  "phone": "+27157931122", "province": "Limpopo", "address": "R527, Hoedspruit, 1380" }
```

### Fruits & stock
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/fruits` | Register a fruit **and** its SMALL/MEDIUM/LARGE stock rows with prices |
| GET | `/api/fruits?status=ACTIVE` | All fruits, with boxes per size |
| GET | `/api/fruits/available` | Active fruits that have stock |
| GET | `/api/fruits/:id` | Fruit with stock per packaging size |
| PUT | `/api/fruits/:id` | Update name / description / status |
| DELETE | `/api/fruits/:id` | Only if never bought or sold (otherwise set INACTIVE) |
| GET | `/api/stock?packaging_size=LARGE` | Stock quantities for every fruit and packaging size |
| GET | `/api/stock/fruit/:fruitId` | Stock for one fruit, broken down by size |
| GET | `/api/stock/low` | Low stock (`available_quantity <= reorder_level`) |
| GET | `/api/stock/low?threshold=5` | Low stock using a custom threshold |
| PUT | `/api/stock/:fruitId/:size` | Change `selling_price` / `reorder_level` for one size |

```json
POST /api/fruits
{ "fruit_name": "Pears", "description": "Packham pears",
  "prices": { "SMALL": 70, "MEDIUM": 125, "LARGE": 210 }, "reorder_level": 10 }
```
Prices must follow SMALL < MEDIUM < LARGE, so every packaging size has a different selling price.

### Vendors
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/vendors` | Register a vendor |
| GET | `/api/vendors` | All vendors |
| GET | `/api/vendors/search?q=palesa` | Search by name **or** phone (`?name=` / `?phone=` also work; phone matches ignore `+`, spaces and dashes) |
| GET | `/api/vendors/:id` | Vendor by ID |
| PUT | `/api/vendors/:id` | Update vendor details |
| GET | `/api/vendors/:id/balance` | Outstanding balance and open sales |

### Purchases
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/purchases` | Record a multi-item purchase; total is calculated; stock goes up |
| GET | `/api/purchases?supplier_id=&start=&end=` | List purchases |
| GET | `/api/purchases/:id` | Purchase with line items |

```json
POST /api/purchases
{ "supplier_id": 1, "purchase_date": "2026-11-16",
  "items": [
    { "fruit_id": 1, "packaging_size": "LARGE", "quantity": 30, "unit_cost": 180 },
    { "fruit_id": 5, "packaging_size": "SMALL", "quantity": 40, "unit_cost": 70 }
  ] }
```
For a supplier that is not registered yet, send `"supplier": { business_name, contact_person, phone, province, address }` instead of `supplier_id`. The supplier is registered in the same transaction.

### Sales
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/sales` | Record a multi-item sale for a registered vendor |
| GET | `/api/sales?vendor_id=&payment_status=UNPAID&start=&end=` | List sales |
| GET | `/api/sales/:id` | Sale with items and payments |

```json
POST /api/sales
{ "vendor_id": 2, "sale_date": "2026-11-16",
  "items": [
    { "fruit_id": 1, "packaging_size": "LARGE",  "quantity": 4 },
    { "fruit_id": 3, "packaging_size": "MEDIUM", "quantity": 10 }
  ],
  "payment": { "payment_method": "MOBILE_MONEY", "amount": 1000, "reference_no": "MPESA-123" } }
```
* Prices are **not** sent. Each line's `unit_price` comes from the stock row for that fruit and packaging size, and the total is calculated automatically.
* `payment` is optional. Use `CASH`, `MOBILE_MONEY` or `CREDIT`. Leaving it out, or sending `CREDIT`, records an UNPAID sale on credit.
* If **any** line is short, the **whole sale is rejected**:

```json
400 Bad Request
{ "success": false, "status": 400,
  "message": "Sale rejected – stock is unavailable. No stock was reduced and no sale was created.",
  "errors": [ { "fruit_id": 1, "fruit_name": "Apples", "packaging_size": "LARGE",
                "requested": 10, "available": 6,
                "reason": "Insufficient stock: requested 10 LARGE box(es) of Apples, only 6 available" } ] }
```

### Payments
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/payments` | Pay against a sale: `{ "sale_id": 3, "amount": 2000, "payment_method": "CASH" }` |
| GET | `/api/payments?sale_id=&method=CASH` | List payments |
| GET | `/api/payments/balances?outstanding=true` | Outstanding balance per vendor + grand total |

### Reports (PART D)
| Method | Endpoint | Report |
|---|---|---|
| GET | `/api/reports/top-fruits?limit=5` | Five most frequently sold fruits (by boxes) |
| GET | `/api/reports/revenue?start=2026-10-01&end=2026-10-31` | Revenue for a date range (+ collected, outstanding, by size) |
| GET | `/api/reports/top-vendor` | Vendor with the most boxes purchased (ties included) |
| GET | `/api/reports/stock-levels` | Current stock per fruit and packaging size |

The same SQL can be run directly from `database/reports.sql`.

---

## 5. Business logic and transactions (PART D)

**Automatic calculations** (`utils/calculations.js`)
* `calculateSaleTotal(items)` = Σ quantity × selling price for that packaging size. Purchases use the same approach with unit cost.
* Money is calculated in cents, which avoids floating-point errors such as 0.1 + 0.2.
* `determinePaymentStatus(total, paid)` returns UNPAID, PARTIALLY_PAID or PAID. `calculateOutstanding()` returns total − paid.

**Stock rules**
* A purchase runs `available_quantity + qty` on the matching fruit and size row.
* A sale runs `available_quantity - qty … WHERE available_quantity >= qty`. This statement can never make stock negative. The CHECK constraint is a second guard.
* Stock rows are locked with `SELECT … FOR UPDATE` during a sale, so two sales at the same moment cannot both sell the last boxes.
* Duplicate lines in one sale (the same fruit and size twice) are added together before the stock check.

**Transactions** (`utils/transaction.js`)
```js
await conn.query('BEGIN');
  // vendor check → lock & check ALL stock → insert sale → insert details → reduce stock → payment
await conn.query('COMMIT');
// on any error:
await conn.query('ROLLBACK');
```
`npm run demo:transaction` shows three cases:
1. A sale of 5 SMALL bananas and 10 LARGE apples, when only 6 LARGE apples exist → **ROLLBACK**. No sale is created and no stock changes.
2. A purchase where the second item is a non-existent fruit → **ROLLBACK**.
3. A valid two-item sale → **COMMIT**. Stock goes down and the payment status is PARTIALLY_PAID.

`database/transaction_demo.sql` shows the same thing in pure SQL. It uses an explicit `BEGIN … ROLLBACK` and a stored procedure with an `EXIT HANDLER` that rolls back.

**Payment management**
* Payment types: **Cash**, **Mobile money** (M-Pesa / EcoCash reference numbers), and **Credit**, which is an outstanding amount with no payment recorded.
* The sale's status is recalculated after every payment. Overpayment is rejected.
* Outstanding balances are available per vendor (`/api/vendors/:id/balance`), for all vendors (`/api/payments/balances`), and through the SQL view `vw_vendor_balances`.

---

## 6. Error handling and resilience
* Controllers use `async/await` with `try/catch` and pass errors to one central `errorHandler`.
* MySQL errors are translated into clear messages: duplicates → 409, foreign-key problems → 400/409, CHECK violations → 400, connection problems → 503.
* **If MySQL is down at startup, the server still starts.** It logs a clear reason (for example "Access denied – check DB_USER and DB_PASSWORD"). Requests get a 503 until MySQL is back, and then the pool reconnects automatically. `/health` reports the database status.
* If the configured port is already in use, the server tries the next 20 ports and prints the URL for the port it successfully opened.
* `unhandledRejection` and `uncaughtException` handlers log problems instead of crashing the process.
* No credentials are in the source code. Everything is read from `.env`.
