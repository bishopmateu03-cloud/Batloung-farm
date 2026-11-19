-- =====================================================================
--  PART D: Database transactions – BEGIN / COMMIT / ROLLBACK demo
--  Scenario from the brief: a vendor requests 10 LARGE boxes of apples
--  but only 6 are available. The whole sale must be rejected.
-- =====================================================================
USE batloung_farm_db;

DROP PROCEDURE IF EXISTS sp_record_two_item_sale;

DELIMITER $$
CREATE PROCEDURE sp_record_two_item_sale(
  IN p_vendor_id INT,
  IN p_fruit1 INT, IN p_size1 VARCHAR(10), IN p_qty1 INT,
  IN p_fruit2 INT, IN p_size2 VARCHAR(10), IN p_qty2 INT
)
BEGIN
  DECLARE v_sale_id INT;
  DECLARE v_avail1, v_avail2 INT DEFAULT NULL;
  DECLARE v_price1, v_price2 DECIMAL(10,2);

  -- Any SQL error inside the transaction -> undo everything
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;   -- equivalent to BEGIN

  -- Lock both stock rows so no other sale can change them meanwhile
  SELECT available_quantity, selling_price INTO v_avail1, v_price1
  FROM stock WHERE fruit_id = p_fruit1 AND packaging_size = p_size1 FOR UPDATE;

  SELECT available_quantity, selling_price INTO v_avail2, v_price2
  FROM stock WHERE fruit_id = p_fruit2 AND packaging_size = p_size2 FOR UPDATE;

  INSERT INTO sales (vendor_id, sale_date, total_amount)
  VALUES (p_vendor_id, CURRENT_DATE, p_qty1 * v_price1 + p_qty2 * v_price2);
  SET v_sale_id = LAST_INSERT_ID();

  -- Item 1
  IF v_avail1 IS NULL OR v_avail1 < p_qty1 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock for item 1 - sale rolled back';
  END IF;
  INSERT INTO sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price)
  VALUES (v_sale_id, p_fruit1, p_size1, p_qty1, v_price1);
  UPDATE stock SET available_quantity = available_quantity - p_qty1
  WHERE fruit_id = p_fruit1 AND packaging_size = p_size1;

  -- Item 2
  IF v_avail2 IS NULL OR v_avail2 < p_qty2 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock for item 2 - sale rolled back';
  END IF;
  INSERT INTO sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price)
  VALUES (v_sale_id, p_fruit2, p_size2, p_qty2, v_price2);
  UPDATE stock SET available_quantity = available_quantity - p_qty2
  WHERE fruit_id = p_fruit2 AND packaging_size = p_size2;

  COMMIT;
  SELECT v_sale_id AS sale_id, 'Sale committed' AS result;
END $$
DELIMITER ;

-- ---------------------------------------------------------------------
-- DEMO 1 (FAILS): 5 SMALL bananas (OK) + 10 LARGE apples (only 6)
-- Item 1 is inserted and stock reduced, then item 2 fails -> ROLLBACK.
-- ---------------------------------------------------------------------
SELECT 'BEFORE demo 1' AS step, fruit_id, packaging_size, available_quantity
FROM stock WHERE (fruit_id, packaging_size) IN ((2,'SMALL'),(1,'LARGE'));

-- Expected: ERROR 1644 (45000): Insufficient stock for item 2 - sale rolled back
-- (run the next line on its own to see the error message)
-- CALL sp_record_two_item_sale(1, 2,'SMALL',5, 1,'LARGE',10);

-- Manual equivalent with explicit BEGIN ... ROLLBACK:
BEGIN;
  INSERT INTO sales (vendor_id, sale_date, total_amount) VALUES (1, CURRENT_DATE, 2700.00);
  SET @demo_sale = LAST_INSERT_ID();
  INSERT INTO sales_details (sale_id, fruit_id, packaging_size, quantity, unit_price)
  VALUES (@demo_sale, 2, 'SMALL', 5, 60.00);
  UPDATE stock SET available_quantity = available_quantity - 5
  WHERE fruit_id = 2 AND packaging_size = 'SMALL';
  -- Validation of item 2: 10 LARGE apples requested, only 6 available
  SELECT available_quantity >= 10 AS large_apples_ok
  FROM stock WHERE fruit_id = 1 AND packaging_size = 'LARGE';   -- returns 0
ROLLBACK;   -- item 2 failed validation, so item 1 is undone as well

SELECT 'AFTER demo 1 (unchanged)' AS step, fruit_id, packaging_size, available_quantity
FROM stock WHERE (fruit_id, packaging_size) IN ((2,'SMALL'),(1,'LARGE'));
SELECT COUNT(*) AS orphan_sale_rows FROM sales WHERE sale_id = @demo_sale;  -- 0

-- ---------------------------------------------------------------------
-- DEMO 2 (SUCCEEDS): 5 SMALL bananas + 4 LARGE apples -> COMMIT
-- ---------------------------------------------------------------------
CALL sp_record_two_item_sale(1, 2,'SMALL',5, 1,'LARGE',4);

SELECT 'AFTER demo 2 (committed)' AS step, fruit_id, packaging_size, available_quantity
FROM stock WHERE (fruit_id, packaging_size) IN ((2,'SMALL'),(1,'LARGE'));
