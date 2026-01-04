import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../ui/Modal';
import DataTable from '../ui/DataTable';
import Button from '../ui/Button';
import { PlusIcon } from '@heroicons/react/24/solid';
import { db } from '../../utils/db';
import ProductModal from './ProductModal';

const ProductSelector = ({ isOpen, onClose, onSelect }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const offset = (currentPage - 1) * pageSize;
      let query = `
        SELECT p.*, u.ProductUnitType 
        FROM Products p
        JOIN ProductUnits u ON p.ProductUnitID = u.ProductUnitID
        WHERE p.ProductIsActive = 1
      `;
      const params = [];
      
      if (searchTerm) {
        const keywords = searchTerm.toLowerCase().split(/\s+/).filter(k => k.length > 0);
        
        // Check for size query (number + optional unit)
        const sizeRegex = /^(\d+)\s*([a-z]+)?$/i;
        const sizeMatch = searchTerm.match(sizeRegex);

        if (sizeMatch) {
          const num = sizeMatch[1];
          const unit = sizeMatch[2];
          
          let sizeCondition = `p.ProductSize = ?`;
          params.push(num);
          
          if (unit) {
            sizeCondition += ` AND u.ProductUnitType LIKE ?`;
            params.push(`${unit}%`);
          }
          
          // If it looks like a size, prioritize that match OR standard text match
          query += ` AND (${sizeCondition} OR (
             REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(p.ProductName), 'é', 'e'), 'è', 'e'), 'ë', 'e'), 'á', 'a'), 'à', 'a'), 'ä', 'a') LIKE ? 
             OR 
             REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(p.ProductBrand), 'é', 'e'), 'è', 'e'), 'ë', 'e'), 'á', 'a'), 'à', 'a'), 'ä', 'a') LIKE ?
          ))`;
          params.push(`%${searchTerm}%`, `%${searchTerm}%`);

        } else if (keywords.length > 0) {
          const conditions = keywords.map(() => `(
            REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(p.ProductName), 'é', 'e'), 'è', 'e'), 'ë', 'e'), 'á', 'a'), 'à', 'a'), 'ä', 'a') LIKE ? 
            OR 
            REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(p.ProductBrand), 'é', 'e'), 'è', 'e'), 'ë', 'e'), 'á', 'a'), 'à', 'a'), 'ä', 'a') LIKE ?
          )`).join(' AND ');
          
          query += ` AND (${conditions})`;
          keywords.forEach(k => {
            const term = `%${k}%`;
            params.push(term, term);
          });
        }
      }
      
      const countQuery = `SELECT COUNT(*) as count FROM (${query.replace('SELECT p.*, u.ProductUnitType', 'SELECT p.ProductID')})`;
      const countResult = await db.queryOne(countQuery, params);
      setTotalCount(countResult ? countResult.count : 0);
      
      query += ` ORDER BY p.ProductName ASC LIMIT ? OFFSET ?`;
      params.push(pageSize, offset);
      
      const results = await db.query(query, params);
      setProducts(results);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm]);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen, fetchProducts]);

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  }, []);

  const handleProductCreated = () => {
    fetchProducts();
    setIsCreateModalOpen(false);
  };

  const columns = [
    { header: 'Name', accessor: 'ProductName', width: '40%' },
    { header: 'Brand', accessor: 'ProductBrand', width: '35%' },
    { header: 'Size', width: '15%', render: (row) => `${row.ProductSize} ${row.ProductUnitType}` },
    {
      header: '',
      width: '10%',
      className: 'text-right pr-4', // Added padding right to cell
      render: (row) => (
        <Button size="sm" onClick={() => onSelect(row)}>
          Select
        </Button>
      )
    }
  ];

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Select Product" size="xl">
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create New Product
            </Button>
          </div>

          <DataTable
            data={products}
            columns={columns}
            totalCount={totalCount}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onSearch={handleSearch}
            loading={loading}
            searchPlaceholder="Search (e.g. 'brand', 'name', '2l', '200g')..."
            className="border-none shadow-none"
          />
        </div>
      </Modal>

      <ProductModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleProductCreated}
      />
    </>
  );
};

export default ProductSelector;
