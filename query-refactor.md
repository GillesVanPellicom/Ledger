# Query Refactoring Plan

This document outlines the plan to refactor all inline SQL queries in the project to use external `.sql` files with TypeScript wrappers. This will improve code organization, reusability, and maintainability.

## Directory Structure

A new directory will be created to store the SQL files and their wrappers:

```
src/
└── db/
    └── queries/
        ├── some_query.sql
        └── some_query.ts
```

## Refactoring Steps

For each inline SQL query found, the following steps will be taken:

1.  **Create a `.sql` file:** A new file with the `.sql` extension will be created in the `src/db/queries` directory. The file will be named descriptively based on the query's purpose (e.g., `get_all_products.sql`). The SQL query will be moved from the source code into this file.

2.  **Create a TypeScript wrapper:** A new TypeScript file will be created alongside the `.sql` file with the same name (e.g., `getAllProducts.ts`). This wrapper will:
    *   Import the necessary database connection.
    *   Read the content of the corresponding `.sql` file.
    *   Export a function that takes any required parameters and executes the SQL query.

3.  **Replace the inline query:** The original inline SQL query in the source code will be replaced with a call to the function exported from the TypeScript wrapper.

## Identified Inline Queries

The following is a list of all inline SQL queries that need to be refactored, grouped by the file in which they are located.

### `/Users/gvp/IdeaProjects/homefin/src/pages/DebtorDetailsPage.jsx`

*   `SELECT SUM(li.LineQuantity * li.LineUnitPrice) FROM LineItems li`
*   `SELECT * FROM Debtors WHERE DebtorID = ?`
*   `SELECT li.*, p.ProductName, p.ProductBrand, p.ProductSize, pu.ProductUnitType FROM LineItems li`
*   `SELECT TopUpID FROM ReceiptDebtorPayments WHERE ReceiptID = ?`
*   `SELECT r.*, s.StoreName, pm.PaymentMethodName FROM Receipts r`
*   `SELECT DISTINCT li.ReceiptID FROM LineItems li WHERE li.DebtorID = ?`
*   `DELETE FROM ReceiptDebtorPayments WHERE ReceiptID = ? AND DebtorID = ?`
*   `DELETE FROM TopUps WHERE TopUpID = ?`

### `/Users/gvp/IdeaProjects/homefin/src/pages/ReceiptsPage.jsx`

*   `(SELECT SUM(li.LineQuantity * li.LineUnitPrice) FROM LineItems li WHERE li.ReceiptID = r`
*   `SELECT COUNT(*) as count FROM (${query.replace(/SELECT r.ReceiptID,.*?as T`
*   `SELECT SUM(li.LineQuantity * li.LineUnitPrice) FROM LineItems li`
*   `SELECT li.*, p.ProductName, p.ProductBrand, p.ProductSize, pu.ProductUnitType FROM LineItems li`
*   `SELECT COUNT(DISTINCT d.DebtorID) FROM Debtors d`
*   `(r.SplitType = 'line_item' AND d.DebtorID IN (SELECT li.DebtorID FROM LineItems li WHE`
*   `SELECT SUM(li_discountable.LineQuantity * li_discountable.LineUnitPrice) FROM`
*   `SELECT r.*, s.StoreName, pm.PaymentMethodName FROM Receipts r`
*   `(r.SplitType = 'total_split' AND d.DebtorID IN (SELECT rs.DebtorID FROM ReceiptSplits`
*   `DELETE FROM Receipts WHERE ReceiptID IN (${placeholders})`

### `/Users/gvp/IdeaProjects/homefin/src/pages/EntityDetailsPage.jsx`

*   `SELECT TopUpID FROM ReceiptDebtorPayments WHERE ReceiptID`
*   `SELECT r.*, s.StoreName, pm.PaymentMethodName FROM Receipts r`
*   `SELECT * FROM ReceiptSplits WHERE ReceiptID IN (${placeholde`
*   `SELECT PaymentMethodID, PaymentMethodName FROM PaymentMethods O`
*   `SELECT * FROM ReceiptImages WHERE ReceiptID = ?`
*   `SELECT li.*, p.ProductName, p.ProductBrand FROM LineItems li`
*   `(r.SplitType = 'total_split' AND r.ReceiptID IN (SELECT rs.ReceiptID FROM ReceiptSplit`
*   `SELECT * FROM Debtors WHERE DebtorID = ?`
*   `SELECT * FROM ReceiptDebtorPayments WHERE ReceiptID IN (${`
*   `(r.SplitType = 'line_item' AND r.ReceiptID IN (SELECT li.ReceiptID FROM LineItems li W`
*   `SELECT * FROM LineItems WHERE ReceiptID IN (${placeholder`
*   `UPDATE Receipts SET Status = ?, PaymentMethodID = ? WHERE ReceiptID = ?`
*   `UPDATE Receipts SET Status = ?, PaymentMethodID = NULL WHERE ReceiptID = ?`
*   `DELETE FROM ReceiptDebtorPayments WHERE ReceiptID = ? AND DebtorID = ?`
*   `DELETE FROM TopUps WHERE TopUpID = ?`

### `/Users/gvp/IdeaProjects/homefin/src/components/products/ProductSelector.jsx`

*   `SELECT p.*, u.ProductUnitType FROM Products p`
*   `SELECT COUNT(*) as count FROM (${query.replace('SELECT p.*, u.ProductUnitT`
*   `SELECT p.*, u.ProductUnitType FROM Products p`

### `/Users/gvp/IdeaProjects/homefin/src/pages/ReceiptFormPage.jsx`

*   `SELECT DebtorID FROM ReceiptDebtorPayments WHERE Re`
*   `SELECT PaymentMethodID, PaymentMethodName FROM Pay`
*   `SELECT * FROM Receipts WHERE ReceiptID = ?`
*   `SELECT DebtorID, DebtorName FROM Debtors WHERE DebtorIsA`
*   `SELECT li.*, p.ProductName, p.ProductBrand, p.ProductSize, pu.ProductUnitType, d.DebtorN`
*   `SELECT StoreID, StoreName FROM Stores WHERE StoreIsActive = 1`
*   `SELECT ImagePath FROM ReceiptImages WHERE ReceiptID =`
*   `SELECT rs.*, d.DebtorName FROM ReceiptSplits rs`
*   `SELECT * FROM ReceiptImages WHERE ReceiptID = ?`
*   `INSERT INTO ReceiptImages (ReceiptID, ImagePath) VALUES (?, ?)`
*   `INSERT INTO ReceiptSplits (ReceiptID, DebtorID, SplitPart) VALUES (?, ?,`
*   `INSERT INTO Receipts`
*   `INSERT INTO LineItems (ReceiptID, ProductID, LineQuantity, LineUnitPrice,`
*   `UPDATE Receipts SET`
*   `DELETE FROM ReceiptImages WHERE ReceiptID = ? AND ImagePath IN (${placeh`
*   `DELETE FROM ReceiptSplits WHERE ReceiptID = ?`
*   `DELETE FROM LineItems WHERE ReceiptID = ?`

### `/Users/gvp/IdeaProjects/homefin/src/pages/PaymentMethodDetailsPage.jsx`

*   `SELECT TopUpID as id, TopUpDate as date, '-' as name, TopUpNote as note, TopUpAmount as amou`
*   `SELECT * FROM LineItems WHERE ReceiptID IN (${receiptIds.map(() => '?').jo`
*   `SELECT * FROM PaymentMethods WHERE PaymentMethodID = ?`
*   `(SELECT SUM(li.LineQuantity * li.LineUnitPrice) FROM LineItems li WHERE li.ReceiptID`
*   `UPDATE PaymentMethods SET PaymentMethodName = ? WHERE PaymentMethodID = ?`
*   `DELETE FROM TopUps WHERE TopUpID = ?`
*   `DELETE FROM Receipts WHERE ReceiptID = ?`

### `/Users/gvp/IdeaProjects/homefin/src/pages/AnalyticsPage.jsx`

*   `SELECT SUM(li.LineQuantity * li.LineUnitPrice) as`
*   `SELECT STRFTIME('%m', r.ReceiptDate) as month, SUM(li.Li`
*   `SELECT DebtorID, DebtorName FROM Debtors WHERE DebtorIsActiv`
*   `SELECT DISTINCT STRFTIME('%Y', ReceiptDate) as year FROM Receip`
*   `SELECT SUM(li.LineQuantity * li.LineUnitPrice) as to`
*   `SELECT SUM(TopUpAmount) as total FROM TopUps WHERE`
*   `SELECT STRFTIME('%m', r.ReceiptDate) as month, S`
*   `SELECT SUM(li.LineQuantity * li.LineUnitPrice) a`
*   `SELECT s.StoreName, SUM(li.LineQuantity * li.LineUnitPrice`
*   `SELECT COUNT(DISTINCT r.ReceiptID) as receiptCount,`
*   `SELECT * FROM PaymentMethods`
*   `SELECT SUM(li.LineQuantity * li.LineUnitPrice) as total`

### `/Users/gvp/IdeaProjects/homefin/src/components/products/ProductModal.jsx`

*   `SELECT * FROM ProductUnits ORDER BY ProductUnitType`
*   `INSERT INTO Products (ProductName, ProductBrand, ProductSize, Pro`
*   `UPDATE Products SET ProductName = ?, ProductBrand = ?, ProductSize = ?, Pr`

### `/Users/gvp/IdeaProjects/homefin/src/pages/ReceiptViewPage.jsx`

*   `SELECT li.*, p.ProductName, p.ProductBrand, p.ProductSize, pu.ProductUnitType, d.DebtorNam`
*   `SELECT ImagePath FROM ReceiptImages WHERE ReceiptID = ?`
*   `SELECT r.*, s.StoreName, pm.PaymentMethodName, d.DebtorName as OwedToDebtorName FROM`
*   `SELECT rs.*, d.DebtorName FROM ReceiptSplits rs`
*   `SELECT * FROM ReceiptDebtorPayments WHERE ReceiptID =`
*   `SELECT PaymentMethodID, PaymentMethodName FROM PaymentMetho`
*   `UPDATE Receipts SET Status = ?, PaymentMethodID = ? WHERE ReceiptID = ?`
*   `DELETE FROM TopUps WHERE TopUpID = ?`
*   `DELETE FROM ReceiptDebtorPayments WHERE PaymentID = ?`

### `/Users/gvp/IdeaProjects/homefin/src/pages/ProductsPage.jsx`

*   `SELECT COUNT(*) as count FROM (${query.replace('SELECT p.*, u.ProductUnitT`
*   `SELECT p.*, u.ProductUnitType FROM Products p`

### `/Users/gvp/IdeaProjects/homefin/src/pages/DebtPage.jsx`

*   `SELECT COUNT(*) as count FROM (${query.replace('SELECT *', 'SELECT DebtorI`
*   `SELECT * FROM Debtors`

### `/Users/gvp/IdeaProjects/homefin/utils/db/seed.js`

*   `SELECT ProductID FROM Products`
*   `SELECT SUM(LineQuantity * LineUnitPrice) as`
*   `SELECT PaymentMethodID FROM PaymentMethods`
*   `SELECT ProductUnitID FROM ProductUnits`
*   `SELECT * FROM PaymentMethods`
*   `SELECT COUNT(*) as count FROM Receipts`
*   `SELECT * FROM PaymentMethods WHERE PaymentMethodName !=`
*   `SELECT DebtorID FROM Debtors`
*   `SELECT StoreID FROM Stores`
*   `INSERT INTO ReceiptSplits (ReceiptID, DebtorID, SplitPart) VALUE`
*   `INSERT INTO TopUps (PaymentMethodID, TopUpAmount, TopUpDate, Top`
*   `INSERT INTO Receipts (ReceiptDate, StoreID, ReceiptNote, PaymentMetho`
*   `INSERT INTO LineItems (ReceiptID, ProductID, LineQuantity, LineUnitP`
*   `UPDATE PaymentMethods SET PaymentMethodFunds = ? WHERE PaymentMethod`

### `/Users/gvp/IdeaProjects/homefin/src/pages/EntitiesPage.jsx`

*   `SELECT COUNT(*) as count FROM (${query.replace('SELECT *', 'SELECT DebtorI`
*   `SELECT * FROM Debtors`

### `/Users/gvp/IdeaProjects/homefin/src/pages/PaymentMethodsPage.jsx`

*   `SELECT * FROM PaymentMethods`
*   `SELECT SUM(TopUpAmount) as total FROM TopUps WHERE P`
*   `SELECT SUM(li.LineQuantity * li.LineUnitPrice) as`

### `/Users/gvp/IdeaProjects/homefin/src/components/debt/BulkDebtModal.jsx`

*   `SELECT ReceiptID FROM LineItems WHERE ReceiptID IN (${receiptIds.join(',')}) AND DebtorID IS`
*   `SELECT DISTINCT ReceiptID FROM (`
*   `SELECT DebtorID, DebtorName FROM Debtors WHERE DebtorIsA`
*   `SELECT ReceiptID FROM ReceiptSplits WHERE ReceiptID IN (${receiptIds.join(',')})`
*   `INSERT INTO ReceiptSplits (ReceiptID, DebtorID, SplitPart) VALUES (?, ?, ?`
*   `UPDATE Receipts SET SplitType = ?, OwnShares = ?, TotalShares = ? WHERE ReceiptID = ?`
*   `DELETE FROM ReceiptSplits WHERE ReceiptID = ?`

### `/Users/gvp/IdeaProjects/homefin/src/pages/StoresPage.jsx`

*   `SELECT COUNT(*) as count FROM (${query.replace('SELECT *', 'SELECT StoreID`
*   `SELECT * FROM Stores`

### `/Users/gvp/IdeaProjects/homefin/src/components/analytics/TopProducts.jsx`

*   `SELECT DISTINCT STRFTIME('%Y', ReceiptDate) as year FROM Receip`

### `/Users/gvp/IdeaProjects/homefin/src/components/debt/DebtSettlementModal.jsx`

*   `SELECT PaymentMethodID, PaymentMethodName FROM PaymentMeth`
*   `INSERT INTO ReceiptDebtorPayments (ReceiptID, DebtorID, PaidDate, TopUpID) VALUES (?, ?, ?,`
*   `INSERT INTO TopUps (PaymentMethodID, TopUpAmount, TopUpDate, TopUpNote) VALUES (?, ?, ?, ?)`

### `/Users/gvp/IdeaProjects/homefin/electron/db_schema.sql`

*   `INSERT INTO ProductUnits (ProductUnitType, ProductUnitDescription)`
*   `INSERT INTO PaymentMethods`

### `/Users/gvp/IdeaProjects/homefin/src/components/debt/EntityModal.jsx`

*   `INSERT INTO Debtors (DebtorName, DebtorIsActive) VALUES (?, ?)`
*   `UPDATE Debtors SET DebtorName = ?, DebtorIsActive = ? WHERE DebtorID = ?`

### `/Users/gvp/IdeaProjects/homefin/src/components/payment/PaymentMethodModal.jsx`

*   `INSERT INTO PaymentMethods (PaymentMethodName, PaymentMethodFunds, Payment`
*   `UPDATE PaymentMethods SET PaymentMethodName = ?, PaymentMethodIsActive = ?`

### `/Users/gvp/IdeaProjects/homefin/src/components/stores/StoreModal.jsx`

*   `INSERT INTO Stores (StoreName, StoreIsActive) VALUES (?, ?)`
*   `UPDATE Stores SET StoreName = ?, StoreIsActive = ? WHERE StoreID = ?`

### `/Users/gvp/IdeaProjects/homefin/src/components/debt/DebtModal.jsx`

*   `INSERT INTO Debtors (DebtorName, DebtorIsActive) VALUES (?, ?)`
*   `UPDATE Debtors SET DebtorName = ?, DebtorIsActive = ? WHERE DebtorID = ?`

### `/Users/gvp/IdeaProjects/homefin/src/components/payment/TopUpModal.jsx`

*   `INSERT INTO TopUps (PaymentMethodID, TopUpAmount, TopUpDate, TopUpNote) VALUES (?, ?, ?,`
*   `UPDATE TopUps SET TopUpAmount = ?, TopUpDate = ?, TopUpNote = ? WHERE TopUpID = ?`

## Revised Folder Organization and Consolidation Plan

Based on the initial analysis, a more organized and consolidated approach will be taken. The queries will be grouped by the table they operate on, and similar queries will be consolidated into a single file.

### Revised Directory Structure

The `src/db/queries` directory will be organized by table name:

```
src/
└── db/
    └── queries/
        ├── debtors/
        │   ├── getDebtorById.sql
        │   ├── getDebtorById.ts
        │   ├── getAllDebtors.sql
        │   ├── getAllDebtors.ts
        │   └── ...
        ├── products/
        │   ├── getProductById.sql
        │   ├── getProductById.ts
        │   └── ...
        └── ...
```

### Consolidation Plan

The following is a plan for consolidating and organizing the queries:

*   **`debtors` table:**
    *   `getDebtorById.sql`: `SELECT * FROM Debtors WHERE DebtorID = ?`
    *   `getAllDebtors.sql`: `SELECT * FROM Debtors`
    *   `getDebtorsCount.sql`: `SELECT COUNT(DISTINCT d.DebtorID) FROM Debtors d`
    *   `getActiveDebtors.sql`: `SELECT DebtorID, DebtorName FROM Debtors WHERE DebtorIsActive = 1`
    *   `insertDebtor.sql`: `INSERT INTO Debtors (DebtorName, DebtorIsActive) VALUES (?, ?)`
    *   `updateDebtor.sql`: `UPDATE Debtors SET DebtorName = ?, DebtorIsActive = ? WHERE DebtorID = ?`

*   **`receipts` table:**
    *   `getReceiptById.sql`: `SELECT * FROM Receipts WHERE ReceiptID = ?`
    *   `getAllReceipts.sql`: `SELECT r.*, s.StoreName, pm.PaymentMethodName FROM Receipts r`
    *   `getReceiptsCount.sql`: `SELECT COUNT(*) as count FROM Receipts`
    *   `getReceiptsByDebtor.sql`: `SELECT DISTINCT li.ReceiptID FROM LineItems li WHERE li.DebtorID = ?`
    *   `insertReceipt.sql`: `INSERT INTO Receipts ...`
    *   `updateReceiptStatus.sql`: `UPDATE Receipts SET Status = ?, PaymentMethodID = ? WHERE ReceiptID = ?`
    *   `deleteReceipts.sql`: `DELETE FROM Receipts WHERE ReceiptID IN (?)`

*   **`line_items` table:**
    *   `getLineItemsByReceipt.sql`: `SELECT li.*, p.ProductName, p.ProductBrand, p.ProductSize, pu.ProductUnitType FROM LineItems li`
    *   `getLineItemsTotal.sql`: `SELECT SUM(li.LineQuantity * li.LineUnitPrice) FROM LineItems li`
    *   `insertLineItem.sql`: `INSERT INTO LineItems ...`
    *   `deleteLineItemsByReceipt.sql`: `DELETE FROM LineItems WHERE ReceiptID = ?`

*   **`products` table:**
    *   `getAllProducts.sql`: `SELECT p.*, u.ProductUnitType FROM Products p`
    *   `insertProduct.sql`: `INSERT INTO Products ...`
    *   `updateProduct.sql`: `UPDATE Products SET ...`

*   **`payment_methods` table:**
    *   `getPaymentMethodById.sql`: `SELECT * FROM PaymentMethods WHERE PaymentMethodID = ?`
    *   `getAllPaymentMethods.sql`: `SELECT * FROM PaymentMethods`
    *   `insertPaymentMethod.sql`: `INSERT INTO PaymentMethods ...`
    *   `updatePaymentMethod.sql`: `UPDATE PaymentMethods SET ...`

*   **`receipt_debtor_payments` table:**
    *   `getReceiptDebtorPayment.sql`: `SELECT TopUpID FROM ReceiptDebtorPayments WHERE ReceiptID = ?`
    *   `insertReceiptDebtorPayment.sql`: `INSERT INTO ReceiptDebtorPayments ...`
    *   `deleteReceiptDebtorPayment.sql`: `DELETE FROM ReceiptDebtorPayments WHERE ReceiptID = ? AND DebtorID = ?`

*   **`receipt_splits` table:**
    *   `getReceiptSplitsByReceipt.sql`: `SELECT * FROM ReceiptSplits WHERE ReceiptID IN (?)`
    *   `insertReceiptSplit.sql`: `INSERT INTO ReceiptSplits ...`
    *   `deleteReceiptSplitsByReceipt.sql`: `DELETE FROM ReceiptSplits WHERE ReceiptID = ?`

*   **`receipt_images` table:**
    *   `getReceiptImagesByReceipt.sql`: `SELECT * FROM ReceiptImages WHERE ReceiptID = ?`
    *   `insertReceiptImage.sql`: `INSERT INTO ReceiptImages ...`
    *   `deleteReceiptImages.sql`: `DELETE FROM ReceiptImages WHERE ReceiptID = ? AND ImagePath IN (?)`

*   **`stores` table:**
    *   `getAllStores.sql`: `SELECT * FROM Stores`
    *   `getActiveStores.sql`: `SELECT StoreID, StoreName FROM Stores WHERE StoreIsActive = 1`
    *   `insertStore.sql`: `INSERT INTO Stores ...`
    *   `updateStore.sql`: `UPDATE Stores SET ...`

*   **`top_ups` table:**
    *   `getTopUpsByPaymentMethod.sql`: `SELECT SUM(TopUpAmount) as total FROM TopUps WHERE PaymentMethodID = ?`
    *   `insertTopUp.sql`: `INSERT INTO TopUps ...`
    *   `updateTopUp.sql`: `UPDATE TopUps SET ...`
    *   `deleteTopUp.sql`: `DELETE FROM TopUps WHERE TopUpID = ?`

*   **`product_units` table:**
    *   `getAllProductUnits.sql`: `SELECT * FROM ProductUnits ORDER BY ProductUnitType`

### Queries to Remain Inline

Some queries are dynamically generated and will remain inline for now. These will be addressed in a future refactoring effort.

*   `SELECT COUNT(*) as count FROM (${query.replace(...)})`
*   Queries with dynamic `WHERE` clauses and `IN` clauses with a variable number of parameters.
*   Analytics queries with complex joins and aggregations.
