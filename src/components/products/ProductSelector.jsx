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
  const pageSize = 5; // Smaller page size for modal

  // Nested Modal for creating new product
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
        query += ` AND (p.ProductName LIKE ? OR p.ProductBrand LIKE ?)`;
        params.push(`%${searchTerm}%`, `%${searchTerm}%`);
      }
      
      // Count
      const countQuery = `SELECT COUNT(*) as count FROM (${query})`;
      const countResult = await db.queryOne(countQuery, params);
      setTotalCount(countResult.count);
      
      // Data
      query += ` ORDER BY p.ProductName ASC LIMIT ? OFFSET ?`;
      params.push(pageSize, offset);
      
      const results = await db.query(query, params);
      setProducts(results);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen, fetchProducts]);

  const handleCreateNew = () => {
    setIsCreateModalOpen(true);
  };

  const handleProductCreated = () => {
    // Refresh list and maybe auto-select the newest one?
    // For now just refresh
    fetchProducts();
  };

  const columns = [
    { header: 'Name', accessor: 'ProductName', className: 'font-medium' },
    { header: 'Brand', accessor: 'ProductBrand' },
    { 
      header: 'Size', 
      render: (row) => `${row.ProductSize} ${row.ProductUnitType}` 
    },
    {
      header: '',
      className: 'w-20 text-right',
      render: (row) => (
        <Button size="sm" onClick={() => onSelect(row)}>
          Select
        </Button>
      )
    }
  ];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Select Product"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" onClick={handleCreateNew}>
              <PlusIcon className="h-4 w-4 mr-2" />
              Create New Product
            </Button>
          </div>

          <DataTable
            data={products}
            columns={columns}
            totalCount={totalCount}
            pageSize={pageSize}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onSearch={(term) => {
              setSearchTerm(term);
              setCurrentPage(1);
            }}
            loading={loading}
            searchPlaceholder="Search to select..."
            className="border-none shadow-none"
          />
        </div>
      </Modal>

      {/* Nested Create Modal */}
      <ProductModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleProductCreated}
      />
    </>
  );
};

export default ProductSelector;
