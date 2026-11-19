-- =====================================================================
--  PART D: SQL reporting queries
-- =====================================================================
USE batloung_farm_db;

-- ---------------------------------------------------------------------
-- 1. The five most frequently sold fruits (by number of boxes sold)
-- ---------------------------------------------------------------------
SELECT f.fruit_id,
       f.fruit_name,
       SUM(sd.quantity)            AS total_boxes_sold,
       COUNT(DISTINCT sd.sale_id)  AS number_of_sales,
       SUM(sd.line_total)          AS revenue
FROM sales_details sd
JOIN fruits f ON f.fruit_id = sd.fruit_id
GROUP BY f.fruit_id, f.fruit_name
ORDER BY total_boxes_sold DESC
LIMIT 5;

-- ---------------------------------------------------------------------
-- 2. Total sales revenue for a specified date range
-- ---------------------------------------------------------------------
SET @start_date = '2026-10-01';
SET @end_date   = '2026-10-31';

SELECT @start_date                       AS start_date,
       @end_date                         AS end_date,
       COUNT(*)                          AS number_of_sales,
       COALESCE(SUM(s.total_amount), 0)  AS total_revenue,
       COALESCE(SUM(s.amount_paid), 0)   AS total_collected,
       COALESCE(SUM(s.total_amount - s.amount_paid), 0) AS total_outstanding
FROM sales s
WHERE s.sale_date BETWEEN @start_date AND @end_date;

-- ---------------------------------------------------------------------
-- 3. Vendor who has purchased the highest number of boxes
--    (RANK() returns every vendor tied for first place)
-- ---------------------------------------------------------------------
SELECT vendor_id, vendor_name, phone_number, total_boxes, total_spent
FROM (
  SELECT v.vendor_id,
         v.vendor_name,
         v.phone_number,
         SUM(sd.quantity)    AS total_boxes,
         SUM(sd.line_total)  AS total_spent,
         RANK() OVER (ORDER BY SUM(sd.quantity) DESC) AS rnk
  FROM vendors v
  JOIN sales s          ON s.vendor_id = v.vendor_id
  JOIN sales_details sd ON sd.sale_id  = s.sale_id
  GROUP BY v.vendor_id, v.vendor_name, v.phone_number
) ranked
WHERE rnk = 1;

-- ---------------------------------------------------------------------
-- 4. Current stock levels for each fruit and packaging size
-- ---------------------------------------------------------------------
SELECT f.fruit_id,
       f.fruit_name,
       st.packaging_size,
       st.available_quantity,
       st.selling_price,
       st.reorder_level,
       CASE WHEN st.available_quantity <= st.reorder_level
            THEN 'LOW' ELSE 'OK' END AS stock_status
FROM stock st
JOIN fruits f ON f.fruit_id = st.fruit_id
ORDER BY f.fruit_name, FIELD(st.packaging_size, 'SMALL', 'MEDIUM', 'LARGE');

-- ---------------------------------------------------------------------
-- Extra: outstanding balance per vendor (payment management)
-- ---------------------------------------------------------------------
SELECT * FROM vw_vendor_balances ORDER BY outstanding_balance DESC;
