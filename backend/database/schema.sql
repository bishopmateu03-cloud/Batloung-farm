-- =====================================================================
--  Batloung Farm Distribution Management System
--  PART A: MySQL database design and implementation
--  Compatible with MySQL 8.0.16+ (CHECK constraints enforced) / MariaDB 10.4+
-- =====================================================================

DROP DATABASE IF EXISTS batloung_farm_db;
CREATE DATABASE batloung_farm_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE batloung_farm_db;

-- ---------------------------------------------------------------------
-- 1. SUPPLIERS  (South African fruit suppliers)
-- ---------------------------------------------------------------------
CREATE TABLE suppliers (
  supplier_id     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  business_name   VARCHAR(120)  NOT NULL,
  contact_person  VARCHAR(100)  NOT NULL,
  phone           VARCHAR(20)   NOT NULL,
  province        ENUM('Gauteng','Free State','KwaZulu-Natal','Western Cape',
                       'Eastern Cape','Limpopo','Mpumalanga','North West',
                       'Northern Cape') NOT NULL,
  address         VARCHAR(255)  NOT NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_suppliers PRIMARY KEY (supplier_id),
  CONSTRAINT uq_suppliers_business_name UNIQUE (business_name),
  CONSTRAINT uq_suppliers_phone UNIQUE (phone),
  CONSTRAINT chk_suppliers_phone CHECK (CHAR_LENGTH(phone) >= 9)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 2. FRUITS  (apples, bananas, oranges, mangoes, grapes ...)
-- ---------------------------------------------------------------------
CREATE TABLE fruits (
  fruit_id     INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  fruit_name   VARCHAR(50)   NOT NULL,
  description  VARCHAR(255)  NULL,
  status       ENUM('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_fruits PRIMARY KEY (fruit_id),
  CONSTRAINT uq_fruits_name UNIQUE (fruit_name)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 3. VENDORS  (street vendors / small retailers in Lesotho)
-- ---------------------------------------------------------------------
CREATE TABLE vendors (
  vendor_id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  vendor_name        VARCHAR(100)  NOT NULL,
  phone_number       VARCHAR(20)   NOT NULL,
  location           VARCHAR(150)  NOT NULL,
  registration_date  DATE          NOT NULL DEFAULT (CURRENT_DATE),
  CONSTRAINT pk_vendors PRIMARY KEY (vendor_id),
  CONSTRAINT uq_vendors_phone UNIQUE (phone_number),
  CONSTRAINT chk_vendors_phone CHECK (CHAR_LENGTH(phone_number) >= 8)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 4. STOCK  (one row per fruit PER PACKAGING SIZE)
--    The UNIQUE (fruit_id, packaging_size) key guarantees a separate
--    balance for SMALL, MEDIUM and LARGE boxes of every fruit.
--    selling_price lives here because each packaging size has its own price.
-- ---------------------------------------------------------------------
CREATE TABLE stock (
  stock_id            INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  fruit_id            INT UNSIGNED  NOT NULL,
  packaging_size      ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  available_quantity  INT           NOT NULL DEFAULT 0,
  selling_price       DECIMAL(10,2) NOT NULL,
  reorder_level       INT           NOT NULL DEFAULT 10,
  last_updated        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                    ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_stock PRIMARY KEY (stock_id),
  CONSTRAINT uq_stock_fruit_size UNIQUE (fruit_id, packaging_size),
  CONSTRAINT fk_stock_fruit FOREIGN KEY (fruit_id)
    REFERENCES fruits (fruit_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT chk_stock_qty_non_negative CHECK (available_quantity >= 0),
  CONSTRAINT chk_stock_price_positive  CHECK (selling_price > 0),
  CONSTRAINT chk_stock_reorder         CHECK (reorder_level >= 0)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 5. PURCHASES  (header – one per supplier delivery)
-- ---------------------------------------------------------------------
CREATE TABLE purchases (
  purchase_id    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  supplier_id    INT UNSIGNED  NOT NULL,
  purchase_date  DATE          NOT NULL,
  total_amount   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_purchases PRIMARY KEY (purchase_id),
  CONSTRAINT fk_purchases_supplier FOREIGN KEY (supplier_id)
    REFERENCES suppliers (supplier_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_purchases_total CHECK (total_amount >= 0)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 6. PURCHASE DETAILS  (line items – many fruits per purchase)
-- ---------------------------------------------------------------------
CREATE TABLE purchase_details (
  purchase_detail_id  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  purchase_id         INT UNSIGNED  NOT NULL,
  fruit_id            INT UNSIGNED  NOT NULL,
  quantity            INT           NOT NULL,
  unit_cost           DECIMAL(10,2) NOT NULL,
  packaging_size      ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  line_total          DECIMAL(12,2) AS (quantity * unit_cost) STORED,
  CONSTRAINT pk_purchase_details PRIMARY KEY (purchase_detail_id),
  CONSTRAINT fk_pd_purchase FOREIGN KEY (purchase_id)
    REFERENCES purchases (purchase_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_pd_fruit FOREIGN KEY (fruit_id)
    REFERENCES fruits (fruit_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_pd_quantity  CHECK (quantity > 0),
  CONSTRAINT chk_pd_unit_cost CHECK (unit_cost > 0)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 7. SALES  (header – one per vendor order)
-- ---------------------------------------------------------------------
CREATE TABLE sales (
  sale_id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  vendor_id       INT UNSIGNED  NOT NULL,
  sale_date       DATE          NOT NULL,
  payment_status  ENUM('PAID','PARTIALLY_PAID','UNPAID') NOT NULL DEFAULT 'UNPAID',
  total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  amount_paid     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_sales PRIMARY KEY (sale_id),
  CONSTRAINT fk_sales_vendor FOREIGN KEY (vendor_id)
    REFERENCES vendors (vendor_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_sales_total       CHECK (total_amount >= 0),
  CONSTRAINT chk_sales_paid        CHECK (amount_paid >= 0),
  CONSTRAINT chk_sales_not_overpay CHECK (amount_paid <= total_amount)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 8. SALES DETAILS  (line items – many fruits per sale)
-- ---------------------------------------------------------------------
CREATE TABLE sales_details (
  sales_detail_id  INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  sale_id          INT UNSIGNED  NOT NULL,
  fruit_id         INT UNSIGNED  NOT NULL,
  packaging_size   ENUM('SMALL','MEDIUM','LARGE') NOT NULL,
  quantity         INT           NOT NULL,
  unit_price       DECIMAL(10,2) NOT NULL,
  line_total       DECIMAL(12,2) AS (quantity * unit_price) STORED,
  CONSTRAINT pk_sales_details PRIMARY KEY (sales_detail_id),
  CONSTRAINT fk_sd_sale FOREIGN KEY (sale_id)
    REFERENCES sales (sale_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_sd_fruit FOREIGN KEY (fruit_id)
    REFERENCES fruits (fruit_id) ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT chk_sd_quantity   CHECK (quantity > 0),
  CONSTRAINT chk_sd_unit_price CHECK (unit_price > 0)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 9. PAYMENTS  (advanced business logic – vendor payment management)
--    CASH and MOBILE_MONEY payments are recorded here. Anything not yet
--    paid is outstanding credit: balance = sales.total_amount - amount_paid
-- ---------------------------------------------------------------------
CREATE TABLE payments (
  payment_id      INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  sale_id         INT UNSIGNED  NOT NULL,
  payment_date    DATE          NOT NULL DEFAULT (CURRENT_DATE),
  amount          DECIMAL(12,2) NOT NULL,
  payment_method  ENUM('CASH','MOBILE_MONEY') NOT NULL,
  reference_no    VARCHAR(50)   NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_payments PRIMARY KEY (payment_id),
  CONSTRAINT fk_payments_sale FOREIGN KEY (sale_id)
    REFERENCES sales (sale_id) ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT chk_payments_amount CHECK (amount > 0)
) ENGINE = InnoDB;

-- Helpful indexes for reports and searches
CREATE INDEX idx_sales_date        ON sales (sale_date);
CREATE INDEX idx_purchases_date    ON purchases (purchase_date);
CREATE INDEX idx_vendors_name      ON vendors (vendor_name);
CREATE INDEX idx_sd_fruit          ON sales_details (fruit_id, packaging_size);

-- Convenience view: outstanding balance per vendor
CREATE VIEW vw_vendor_balances AS
SELECT v.vendor_id,
       v.vendor_name,
       v.phone_number,
       COUNT(s.sale_id)                                   AS number_of_sales,
       COALESCE(SUM(s.total_amount), 0)                   AS total_billed,
       COALESCE(SUM(s.amount_paid), 0)                    AS total_paid,
       COALESCE(SUM(s.total_amount - s.amount_paid), 0)   AS outstanding_balance
FROM vendors v
LEFT JOIN sales s ON s.vendor_id = v.vendor_id
GROUP BY v.vendor_id, v.vendor_name, v.phone_number;


-- =====================================================================
--  SAMPLE DATA  (amounts in Maloti, M)
-- =====================================================================

INSERT INTO suppliers (business_name, contact_person, phone, province, address) VALUES
('Ceres Valley Fruit Growers',   'Pieter van der Merwe', '+27233120451', 'Western Cape',  '14 Voortrekker Rd, Ceres, 6835'),
('Tzaneen Tropical Farms',       'Lerato Mokoena',       '+27153074412', 'Limpopo',       'Plot 22, Letsitele Rd, Tzaneen, 0850'),
('Sundays River Citrus Co-op',   'Andile Ndlovu',        '+27422340987', 'Eastern Cape',  '3 Main St, Kirkwood, 6120'),
('Lowveld Fresh Produce',        'Thabo Sithole',        '+27137521630', 'Mpumalanga',    '45 Ferreira St, Mbombela, 1200'),
('Joburg Market Fruit Traders',  'Sipho Dlamini',        '+27116137000', 'Gauteng',       'City Deep Fresh Produce Market, Johannesburg, 2049'),
('Ficksburg Cherry & Orchard',   'Anna Botha',           '+27519332210', 'Free State',    '8 Fontein St, Ficksburg, 9730'),
('Komatipoort Banana Estates',   'Nomsa Zulu',           '+27357904411', 'KwaZulu-Natal', 'Farm 17, Hluhluwe Rd, Hluhluwe, 3960'),
('Brits Agri Supplies',          'Kagiso Molefe',        '+27122523390', 'North West',    '12 Railway Ave, Brits, 0250');

INSERT INTO fruits (fruit_name, description, status) VALUES
('Apples',  'Golden Delicious and Granny Smith apples', 'ACTIVE'),
('Bananas', 'Cavendish bananas, ripened',               'ACTIVE'),
('Oranges', 'Navel and Valencia oranges',               'ACTIVE'),
('Mangoes', 'Tommy Atkins and Keitt mangoes',           'ACTIVE'),
('Grapes',  'Red Globe and white seedless table grapes','ACTIVE');

INSERT INTO vendors (vendor_name, phone_number, location, registration_date) VALUES
('Mme Palesa Fruit Stall',  '+26658123456', 'Maseru Bus Stop, Maseru',        '2025-02-14'),
('Ntate Tumelo Traders',    '+26662234567', 'Pioneer Mall Entrance, Maseru',  '2025-05-03'),
('Ha Thetsane Mini Market', '+26657345678', 'Ha Thetsane, Maseru',            '2025-08-21'),
('Lithabaneng Fresh Corner','+26663456789', 'Lithabaneng, Maseru',            '2026-01-10'),
('Mafeteng Road Vendors',   '+26658567890', 'Kingsway / Mafeteng Rd, Maseru', '2026-03-28'),
('Roma Campus Fruits',      '+26662678901', 'NUL Gate, Roma',                 '2026-06-15');

-- Stock rows: one per fruit per packaging size, each with its own selling price.
-- Quantities start at 0 and are derived from purchases minus sales below.
INSERT INTO stock (fruit_id, packaging_size, available_quantity, selling_price, reorder_level) VALUES
(1,'SMALL',0, 85.00,15),(1,'MEDIUM',0,150.00,10),(1,'LARGE',0,240.00,10),
(2,'SMALL',0, 60.00,15),(2,'MEDIUM',0,105.00,10),(2,'LARGE',0,175.00,10),
(3,'SMALL',0, 65.00,15),(3,'MEDIUM',0,115.00,10),(3,'LARGE',0,200.00,10),
(4,'SMALL',0, 90.00,15),(4,'MEDIUM',0,165.00,10),(4,'LARGE',0,270.00,10),
(5,'SMALL',0, 95.00,15),(5,'MEDIUM',0,175.00,10),(5,'LARGE',0,290.00,10);

-- Purchases (headers) – totals are calculated from the details below
INSERT INTO purchases (supplier_id, purchase_date) VALUES
(1,'2026-10-01'),   -- 1 apples + grapes from Western Cape
(2,'2026-10-03'),   -- 2 mangoes from Limpopo
(3,'2026-10-05'),   -- 3 oranges from Eastern Cape
(7,'2026-10-07'),   -- 4 bananas from KwaZulu-Natal
(1,'2026-11-01');   -- 5 extra large apples

INSERT INTO purchase_details (purchase_id, fruit_id, quantity, unit_cost, packaging_size) VALUES
(1,1,100, 60.00,'SMALL'),(1,1,80,110.00,'MEDIUM'),(1,1,60,180.00,'LARGE'),
(1,5, 50, 70.00,'SMALL'),(1,5,30,130.00,'MEDIUM'),(1,5,10,220.00,'LARGE'),
(2,4, 60, 65.00,'SMALL'),(2,4,40,120.00,'MEDIUM'),(2,4,25,200.00,'LARGE'),
(3,3,120, 45.00,'SMALL'),(3,3,90, 85.00,'MEDIUM'),(3,3,50,150.00,'LARGE'),
(4,2,100, 40.00,'SMALL'),(4,2,70, 75.00,'MEDIUM'),(4,2,40,130.00,'LARGE'),
(5,1, 20,185.00,'LARGE');

UPDATE purchases p
SET total_amount = (SELECT SUM(pd.line_total) FROM purchase_details pd
                    WHERE pd.purchase_id = p.purchase_id);

-- Sales (headers)
INSERT INTO sales (vendor_id, sale_date) VALUES
(1,'2026-10-10'),(2,'2026-10-12'),(3,'2026-10-15'),(1,'2026-10-20'),
(4,'2026-10-25'),(5,'2026-11-05'),(6,'2026-11-10');

-- Sale lines use the packaging-size selling price from STOCK
INSERT INTO sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price)
SELECT x.sale_id, x.fruit_id, x.packaging_size, x.quantity, st.selling_price
FROM (
  SELECT 1 AS sale_id, 1 AS fruit_id, 'LARGE'  AS packaging_size, 30 AS quantity UNION ALL
  SELECT 1, 2, 'SMALL',  20 UNION ALL
  SELECT 2, 3, 'MEDIUM', 40 UNION ALL
  SELECT 2, 4, 'SMALL',  15 UNION ALL
  SELECT 3, 5, 'LARGE',   8 UNION ALL
  SELECT 3, 1, 'SMALL',  25 UNION ALL
  SELECT 4, 2, 'MEDIUM', 35 UNION ALL
  SELECT 4, 3, 'SMALL',  50 UNION ALL
  SELECT 5, 4, 'LARGE',  20 UNION ALL
  SELECT 5, 1, 'MEDIUM', 30 UNION ALL
  SELECT 6, 1, 'LARGE',  44 UNION ALL
  SELECT 7, 3, 'LARGE',  10 UNION ALL
  SELECT 7, 5, 'SMALL',  20
) AS x
JOIN stock st ON st.fruit_id = x.fruit_id AND st.packaging_size = x.packaging_size;

UPDATE sales s
SET total_amount = (SELECT SUM(sd.line_total) FROM sales_details sd
                    WHERE sd.sale_id = s.sale_id);

-- Payments: cash, mobile money and outstanding (credit) examples
INSERT INTO payments (sale_id, payment_date, amount, payment_method, reference_no) VALUES
(1,'2026-10-10', 8400.00,'CASH',        NULL),           -- sale 1 fully paid
(2,'2026-10-12', 3000.00,'MOBILE_MONEY','MPESA-7781203'),-- sale 2 partially paid
(4,'2026-10-20', 4000.00,'CASH',        NULL),           -- sale 4 paid in two
(4,'2026-10-27', 2925.00,'MOBILE_MONEY','ECOCASH-55120'),--   instalments
(5,'2026-10-25', 5000.00,'MOBILE_MONEY','MPESA-7790144'),-- sale 5 partially paid
(6,'2026-11-05',10560.00,'CASH',        NULL);           -- sale 6 fully paid
-- sales 3 and 7 were taken on credit (UNPAID)

UPDATE sales s
SET amount_paid = COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.sale_id = s.sale_id), 0);

UPDATE sales
SET payment_status = CASE
      WHEN amount_paid = 0              THEN 'UNPAID'
      WHEN amount_paid >= total_amount  THEN 'PAID'
      ELSE 'PARTIALLY_PAID'
    END;

-- Stock = boxes purchased - boxes sold, per fruit AND packaging size
UPDATE stock st
SET available_quantity =
      COALESCE((SELECT SUM(pd.quantity) FROM purchase_details pd
                WHERE pd.fruit_id = st.fruit_id AND pd.packaging_size = st.packaging_size), 0)
    - COALESCE((SELECT SUM(sd.quantity) FROM sales_details sd
                WHERE sd.fruit_id = st.fruit_id AND sd.packaging_size = st.packaging_size), 0);

-- Result: Apples LARGE = 6 boxes (matches the assignment's "only 6 large boxes" scenario),
--         Mangoes LARGE = 5 and Grapes LARGE = 2 (below reorder level → low stock).
