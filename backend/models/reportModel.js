/** PART D – SQL reporting queries (same SQL as database/reports.sql). */
const { pool } = require('../config/db');

/** The N (default 5) most frequently sold fruits by boxes sold. */
async function topSellingFruits(limit = 5) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 5, 1), 50);
  const [rows] = await pool.query(
    `SELECT f.fruit_id, f.fruit_name,
            SUM(sd.quantity)           AS total_boxes_sold,
            COUNT(DISTINCT sd.sale_id) AS number_of_sales,
            SUM(sd.line_total)         AS revenue
     FROM sales_details sd
     JOIN fruits f ON f.fruit_id = sd.fruit_id
     GROUP BY f.fruit_id, f.fruit_name
     ORDER BY total_boxes_sold DESC
     LIMIT ?`,
    [safeLimit],
  );
  return rows;
}

/** Total sales revenue between two dates (inclusive), plus a daily breakdown. */
async function revenueBetween(start, end) {
  const [summary] = await pool.execute(
    `SELECT COUNT(*)                          AS number_of_sales,
            COALESCE(SUM(total_amount), 0)    AS total_revenue,
            COALESCE(SUM(amount_paid), 0)     AS total_collected,
            COALESCE(SUM(total_amount - amount_paid), 0) AS total_outstanding
     FROM sales
     WHERE sale_date BETWEEN ? AND ?`,
    [start, end],
  );
  const [bySize] = await pool.execute(
    `SELECT sd.packaging_size, SUM(sd.quantity) AS boxes_sold, SUM(sd.line_total) AS revenue
     FROM sales s JOIN sales_details sd ON sd.sale_id = s.sale_id
     WHERE s.sale_date BETWEEN ? AND ?
     GROUP BY sd.packaging_size
     ORDER BY FIELD(sd.packaging_size, 'SMALL','MEDIUM','LARGE')`,
    [start, end],
  );
  return { start_date: start, end_date: end, ...summary[0], by_packaging_size: bySize };
}

/** Vendor(s) who bought the highest number of boxes (ties included). */
async function topVendorByBoxes() {
  const [rows] = await pool.execute(
    `SELECT vendor_id, vendor_name, phone_number, total_boxes, total_spent
     FROM (
       SELECT v.vendor_id, v.vendor_name, v.phone_number,
              SUM(sd.quantity)   AS total_boxes,
              SUM(sd.line_total) AS total_spent,
              RANK() OVER (ORDER BY SUM(sd.quantity) DESC) AS rnk
       FROM vendors v
       JOIN sales s          ON s.vendor_id = v.vendor_id
       JOIN sales_details sd ON sd.sale_id  = s.sale_id
       GROUP BY v.vendor_id, v.vendor_name, v.phone_number
     ) ranked
     WHERE rnk = 1`,
  );
  return rows;
}

/** Current stock levels for each fruit and packaging size. */
async function currentStockLevels() {
  const [rows] = await pool.execute(
    `SELECT f.fruit_id, f.fruit_name, st.packaging_size, st.available_quantity,
            st.selling_price, st.reorder_level,
            CASE WHEN st.available_quantity <= st.reorder_level THEN 'LOW' ELSE 'OK' END AS stock_status
     FROM stock st
     JOIN fruits f ON f.fruit_id = st.fruit_id
     ORDER BY f.fruit_name, FIELD(st.packaging_size, 'SMALL','MEDIUM','LARGE')`,
  );
  return rows;
}

module.exports = { topSellingFruits, revenueBetween, topVendorByBoxes, currentStockLevels };
