SELECT li.*, p.ProductName, p.ProductBrand, p.ProductSize, pu.ProductUnitType FROM LineItems li
JOIN Products p ON li.ProductID = p.ProductID
JOIN ProductUnits pu ON p.ProductUnitID = pu.ProductUnitID
WHERE li.ReceiptID = ?;
