-- MySQL dump 10.13  Distrib 8.0.46, for Win64 (x86_64)
--
-- Host: localhost    Database: batloung_farm_db
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `fruits`
--

DROP TABLE IF EXISTS `fruits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fruits` (
  `fruit_id` int unsigned NOT NULL AUTO_INCREMENT,
  `fruit_name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('ACTIVE','INACTIVE') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`fruit_id`),
  UNIQUE KEY `uq_fruits_name` (`fruit_name`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fruits`
--

LOCK TABLES `fruits` WRITE;
/*!40000 ALTER TABLE `fruits` DISABLE KEYS */;
INSERT INTO `fruits` VALUES (1,'Apples','Golden Delicious and Granny Smith apples','ACTIVE','2026-11-17 21:13:36'),(2,'Bananas','Cavendish bananas, ripened','ACTIVE','2026-11-17 21:13:36'),(3,'Oranges','Navel and Valencia oranges','ACTIVE','2026-11-17 21:13:36'),(4,'Mangoes','Tommy Atkins and Keitt mangoes','ACTIVE','2026-11-17 21:13:36'),(5,'Grapes','Red Globe and white seedless table grapes','ACTIVE','2026-11-17 21:13:36');
/*!40000 ALTER TABLE `fruits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `payment_id` int unsigned NOT NULL AUTO_INCREMENT,
  `sale_id` int unsigned NOT NULL,
  `payment_date` date NOT NULL DEFAULT (curdate()),
  `amount` decimal(12,2) NOT NULL,
  `payment_method` enum('CASH','MOBILE_MONEY') COLLATE utf8mb4_unicode_ci NOT NULL,
  `reference_no` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  KEY `fk_payments_sale` (`sale_id`),
  CONSTRAINT `fk_payments_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`sale_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_payments_amount` CHECK ((`amount` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,1,'2026-10-10',8400.00,'CASH',NULL,'2026-11-17 21:13:36'),(2,2,'2026-10-12',3000.00,'MOBILE_MONEY','MPESA-7781203','2026-11-17 21:13:36'),(3,4,'2026-10-20',4000.00,'CASH',NULL,'2026-11-17 21:13:36'),(4,4,'2026-10-27',2925.00,'MOBILE_MONEY','ECOCASH-55120','2026-11-17 21:13:36'),(5,5,'2026-10-25',5000.00,'MOBILE_MONEY','MPESA-7790144','2026-11-17 21:13:36'),(6,6,'2026-11-05',10560.00,'CASH',NULL,'2026-11-17 21:13:36');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchase_details`
--

DROP TABLE IF EXISTS `purchase_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchase_details` (
  `purchase_detail_id` int unsigned NOT NULL AUTO_INCREMENT,
  `purchase_id` int unsigned NOT NULL,
  `fruit_id` int unsigned NOT NULL,
  `quantity` int NOT NULL,
  `unit_cost` decimal(10,2) NOT NULL,
  `packaging_size` enum('SMALL','MEDIUM','LARGE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `line_total` decimal(12,2) GENERATED ALWAYS AS ((`quantity` * `unit_cost`)) STORED,
  PRIMARY KEY (`purchase_detail_id`),
  KEY `fk_pd_purchase` (`purchase_id`),
  KEY `fk_pd_fruit` (`fruit_id`),
  CONSTRAINT `fk_pd_fruit` FOREIGN KEY (`fruit_id`) REFERENCES `fruits` (`fruit_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_pd_purchase` FOREIGN KEY (`purchase_id`) REFERENCES `purchases` (`purchase_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_pd_quantity` CHECK ((`quantity` > 0)),
  CONSTRAINT `chk_pd_unit_cost` CHECK ((`unit_cost` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchase_details`
--

LOCK TABLES `purchase_details` WRITE;
/*!40000 ALTER TABLE `purchase_details` DISABLE KEYS */;
INSERT INTO `purchase_details` (`purchase_detail_id`, `purchase_id`, `fruit_id`, `quantity`, `unit_cost`, `packaging_size`) VALUES (1,1,1,100,60.00,'SMALL'),(2,1,1,80,110.00,'MEDIUM'),(3,1,1,60,180.00,'LARGE'),(4,1,5,50,70.00,'SMALL'),(5,1,5,30,130.00,'MEDIUM'),(6,1,5,10,220.00,'LARGE'),(7,2,4,60,65.00,'SMALL'),(8,2,4,40,120.00,'MEDIUM'),(9,2,4,25,200.00,'LARGE'),(10,3,3,120,45.00,'SMALL'),(11,3,3,90,85.00,'MEDIUM'),(12,3,3,50,150.00,'LARGE'),(13,4,2,100,40.00,'SMALL'),(14,4,2,70,75.00,'MEDIUM'),(15,4,2,40,130.00,'LARGE'),(16,5,1,20,185.00,'LARGE');
/*!40000 ALTER TABLE `purchase_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `purchases`
--

DROP TABLE IF EXISTS `purchases`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `purchases` (
  `purchase_id` int unsigned NOT NULL AUTO_INCREMENT,
  `supplier_id` int unsigned NOT NULL,
  `purchase_date` date NOT NULL,
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`purchase_id`),
  KEY `fk_purchases_supplier` (`supplier_id`),
  KEY `idx_purchases_date` (`purchase_date`),
  CONSTRAINT `fk_purchases_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`supplier_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_purchases_total` CHECK ((`total_amount` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `purchases`
--

LOCK TABLES `purchases` WRITE;
/*!40000 ALTER TABLE `purchases` DISABLE KEYS */;
INSERT INTO `purchases` VALUES (1,1,'2026-10-01',35200.00,'2026-11-17 21:13:36'),(2,2,'2026-10-03',13700.00,'2026-11-17 21:13:36'),(3,3,'2026-10-05',20550.00,'2026-11-17 21:13:36'),(4,7,'2026-10-07',14450.00,'2026-11-17 21:13:36'),(5,1,'2026-11-01',3700.00,'2026-11-17 21:13:36');
/*!40000 ALTER TABLE `purchases` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales`
--

DROP TABLE IF EXISTS `sales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales` (
  `sale_id` int unsigned NOT NULL AUTO_INCREMENT,
  `vendor_id` int unsigned NOT NULL,
  `sale_date` date NOT NULL,
  `payment_status` enum('PAID','PARTIALLY_PAID','UNPAID') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'UNPAID',
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `amount_paid` decimal(12,2) NOT NULL DEFAULT '0.00',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`sale_id`),
  KEY `fk_sales_vendor` (`vendor_id`),
  KEY `idx_sales_date` (`sale_date`),
  CONSTRAINT `fk_sales_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendors` (`vendor_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `chk_sales_not_overpay` CHECK ((`amount_paid` <= `total_amount`)),
  CONSTRAINT `chk_sales_paid` CHECK ((`amount_paid` >= 0)),
  CONSTRAINT `chk_sales_total` CHECK ((`total_amount` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales`
--

LOCK TABLES `sales` WRITE;
/*!40000 ALTER TABLE `sales` DISABLE KEYS */;
INSERT INTO `sales` VALUES (1,1,'2026-10-10','PAID',8400.00,8400.00,'2026-11-17 21:13:36'),(2,2,'2026-10-12','PARTIALLY_PAID',5950.00,3000.00,'2026-11-17 21:13:36'),(3,3,'2026-10-15','UNPAID',4445.00,0.00,'2026-11-17 21:13:36'),(4,1,'2026-10-20','PAID',6925.00,6925.00,'2026-11-17 21:13:36'),(5,4,'2026-10-25','PARTIALLY_PAID',9900.00,5000.00,'2026-11-17 21:13:36'),(6,5,'2026-11-05','PAID',10560.00,10560.00,'2026-11-17 21:13:36'),(7,6,'2026-11-10','UNPAID',3900.00,0.00,'2026-11-17 21:13:36');
/*!40000 ALTER TABLE `sales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sales_details`
--

DROP TABLE IF EXISTS `sales_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sales_details` (
  `sales_detail_id` int unsigned NOT NULL AUTO_INCREMENT,
  `sale_id` int unsigned NOT NULL,
  `fruit_id` int unsigned NOT NULL,
  `packaging_size` enum('SMALL','MEDIUM','LARGE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `line_total` decimal(12,2) GENERATED ALWAYS AS ((`quantity` * `unit_price`)) STORED,
  PRIMARY KEY (`sales_detail_id`),
  KEY `fk_sd_sale` (`sale_id`),
  KEY `idx_sd_fruit` (`fruit_id`,`packaging_size`),
  CONSTRAINT `fk_sd_fruit` FOREIGN KEY (`fruit_id`) REFERENCES `fruits` (`fruit_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_sd_sale` FOREIGN KEY (`sale_id`) REFERENCES `sales` (`sale_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_sd_quantity` CHECK ((`quantity` > 0)),
  CONSTRAINT `chk_sd_unit_price` CHECK ((`unit_price` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sales_details`
--

LOCK TABLES `sales_details` WRITE;
/*!40000 ALTER TABLE `sales_details` DISABLE KEYS */;
INSERT INTO `sales_details` (`sales_detail_id`, `sale_id`, `fruit_id`, `packaging_size`, `quantity`, `unit_price`) VALUES (1,1,1,'LARGE',30,240.00),(2,1,2,'SMALL',20,60.00),(3,2,3,'MEDIUM',40,115.00),(4,2,4,'SMALL',15,90.00),(5,3,5,'LARGE',8,290.00),(6,3,1,'SMALL',25,85.00),(7,4,2,'MEDIUM',35,105.00),(8,4,3,'SMALL',50,65.00),(9,5,4,'LARGE',20,270.00),(10,5,1,'MEDIUM',30,150.00),(11,6,1,'LARGE',44,240.00),(12,7,3,'LARGE',10,200.00),(13,7,5,'SMALL',20,95.00);
/*!40000 ALTER TABLE `sales_details` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `stock`
--

DROP TABLE IF EXISTS `stock`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `stock` (
  `stock_id` int unsigned NOT NULL AUTO_INCREMENT,
  `fruit_id` int unsigned NOT NULL,
  `packaging_size` enum('SMALL','MEDIUM','LARGE') COLLATE utf8mb4_unicode_ci NOT NULL,
  `available_quantity` int NOT NULL DEFAULT '0',
  `selling_price` decimal(10,2) NOT NULL,
  `reorder_level` int NOT NULL DEFAULT '10',
  `last_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`stock_id`),
  UNIQUE KEY `uq_stock_fruit_size` (`fruit_id`,`packaging_size`),
  CONSTRAINT `fk_stock_fruit` FOREIGN KEY (`fruit_id`) REFERENCES `fruits` (`fruit_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_stock_price_positive` CHECK ((`selling_price` > 0)),
  CONSTRAINT `chk_stock_qty_non_negative` CHECK ((`available_quantity` >= 0)),
  CONSTRAINT `chk_stock_reorder` CHECK ((`reorder_level` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `stock`
--

LOCK TABLES `stock` WRITE;
/*!40000 ALTER TABLE `stock` DISABLE KEYS */;
INSERT INTO `stock` VALUES (16,1,'SMALL',50,25.00,10,'2026-11-17 21:40:28'),(17,1,'MEDIUM',40,45.00,10,'2026-11-17 21:40:28'),(18,1,'LARGE',30,80.00,10,'2026-11-17 21:40:28'),(19,2,'SMALL',60,20.00,10,'2026-11-17 21:40:28'),(20,2,'MEDIUM',45,35.00,10,'2026-11-17 21:40:28'),(21,2,'LARGE',25,65.00,10,'2026-11-17 21:40:28'),(22,3,'SMALL',50,15.00,10,'2026-11-17 21:40:28'),(23,3,'MEDIUM',40,30.00,10,'2026-11-17 21:40:28'),(24,3,'LARGE',20,55.00,10,'2026-11-17 21:40:28'),(25,4,'SMALL',35,30.00,10,'2026-11-17 21:40:28'),(26,4,'MEDIUM',25,55.00,10,'2026-11-17 21:40:28'),(27,4,'LARGE',15,100.00,10,'2026-11-17 21:40:28'),(28,5,'SMALL',40,35.00,10,'2026-11-17 21:40:28'),(29,5,'MEDIUM',30,65.00,10,'2026-11-17 21:40:28'),(30,5,'LARGE',20,120.00,10,'2026-11-17 21:40:28');
/*!40000 ALTER TABLE `stock` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `suppliers`
--

DROP TABLE IF EXISTS `suppliers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `suppliers` (
  `supplier_id` int unsigned NOT NULL AUTO_INCREMENT,
  `business_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact_person` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `province` enum('Gauteng','Free State','KwaZulu-Natal','Western Cape','Eastern Cape','Limpopo','Mpumalanga','North West','Northern Cape') COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`supplier_id`),
  UNIQUE KEY `uq_suppliers_business_name` (`business_name`),
  UNIQUE KEY `uq_suppliers_phone` (`phone`),
  CONSTRAINT `chk_suppliers_phone` CHECK ((char_length(`phone`) >= 9))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `suppliers`
--

LOCK TABLES `suppliers` WRITE;
/*!40000 ALTER TABLE `suppliers` DISABLE KEYS */;
INSERT INTO `suppliers` VALUES (1,'Ceres Valley Fruit Growers','Pieter van der Merwe','+27233120451','Western Cape','14 Voortrekker Rd, Ceres, 6835','2026-11-17 21:13:36'),(2,'Tzaneen Tropical Farms','Lerato Mokoena','+27153074412','Limpopo','Plot 22, Letsitele Rd, Tzaneen, 0850','2026-11-17 21:13:36'),(3,'Sundays River Citrus Co-op','Andile Ndlovu','+27422340987','Eastern Cape','3 Main St, Kirkwood, 6120','2026-11-17 21:13:36'),(4,'Lowveld Fresh Produce','Thabo Sithole','+27137521630','Mpumalanga','45 Ferreira St, Mbombela, 1200','2026-11-17 21:13:36'),(5,'Joburg Market Fruit Traders','Sipho Dlamini','+27116137000','Gauteng','City Deep Fresh Produce Market, Johannesburg, 2049','2026-11-17 21:13:36'),(6,'Ficksburg Cherry & Orchard','Anna Botha','+27519332210','Free State','8 Fontein St, Ficksburg, 9730','2026-11-17 21:13:36'),(7,'Komatipoort Banana Estates','Nomsa Zulu','+27357904411','KwaZulu-Natal','Farm 17, Hluhluwe Rd, Hluhluwe, 3960','2026-11-17 21:13:36'),(8,'Brits Agri Supplies','Kagiso Molefe','+27122523390','North West','12 Railway Ave, Brits, 0250','2026-11-17 21:13:36');
/*!40000 ALTER TABLE `suppliers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vendors`
--

DROP TABLE IF EXISTS `vendors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vendors` (
  `vendor_id` int unsigned NOT NULL AUTO_INCREMENT,
  `vendor_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone_number` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `registration_date` date NOT NULL DEFAULT (curdate()),
  PRIMARY KEY (`vendor_id`),
  UNIQUE KEY `uq_vendors_phone` (`phone_number`),
  KEY `idx_vendors_name` (`vendor_name`),
  CONSTRAINT `chk_vendors_phone` CHECK ((char_length(`phone_number`) >= 8))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vendors`
--

LOCK TABLES `vendors` WRITE;
/*!40000 ALTER TABLE `vendors` DISABLE KEYS */;
INSERT INTO `vendors` VALUES (1,'Mme Palesa Fruit Stall','+26658123456','Maseru Bus Stop, Maseru','2025-02-14'),(2,'Ntate Tumelo Traders','+26662234567','Pioneer Mall Entrance, Maseru','2025-05-03'),(3,'Ha Thetsane Mini Market','+26657345678','Ha Thetsane, Maseru','2025-08-21'),(4,'Lithabaneng Fresh Corner','+26663456789','Lithabaneng, Maseru','2026-01-10'),(5,'Mafeteng Road Vendors','+26658567890','Kingsway / Mafeteng Rd, Maseru','2026-03-28'),(6,'Roma Campus Fruits','+26662678901','NUL Gate, Roma','2026-06-15');
/*!40000 ALTER TABLE `vendors` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `vw_vendor_balances`
--

DROP TABLE IF EXISTS `vw_vendor_balances`;
/*!50001 DROP VIEW IF EXISTS `vw_vendor_balances`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_vendor_balances` AS SELECT 
 1 AS `vendor_id`,
 1 AS `vendor_name`,
 1 AS `phone_number`,
 1 AS `number_of_sales`,
 1 AS `total_billed`,
 1 AS `total_paid`,
 1 AS `outstanding_balance`*/;
SET character_set_client = @saved_cs_client;

--
-- Dumping events for database 'batloung_farm_db'
--

--
-- Dumping routines for database 'batloung_farm_db'
--

--
-- Final view structure for view `vw_vendor_balances`
--

/*!50001 DROP VIEW IF EXISTS `vw_vendor_balances`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_vendor_balances` AS select `v`.`vendor_id` AS `vendor_id`,`v`.`vendor_name` AS `vendor_name`,`v`.`phone_number` AS `phone_number`,count(`s`.`sale_id`) AS `number_of_sales`,coalesce(sum(`s`.`total_amount`),0) AS `total_billed`,coalesce(sum(`s`.`amount_paid`),0) AS `total_paid`,coalesce(sum((`s`.`total_amount` - `s`.`amount_paid`)),0) AS `outstanding_balance` from (`vendors` `v` left join `sales` `s` on((`s`.`vendor_id` = `v`.`vendor_id`))) group by `v`.`vendor_id`,`v`.`vendor_name`,`v`.`phone_number` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-18  2:05:10
