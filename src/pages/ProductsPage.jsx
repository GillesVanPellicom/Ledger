import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import { PlusIcon, PencilIcon } from '@heroicons/react/24/solid';
import { db } from '../utils/db';
import ProductModal from '../components/products/ProductModal';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Pagination & Search State
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

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
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = useCallback((term) => {
    setSearchTerm(term);
    setCurrentPage(1);
  }, []);

  const handleAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const columns = [
    { header: 'Name', accessor: 'ProductName', className: 'font-medium' },
    { header: 'Brand', accessor: 'ProductBrand' },
    { 
      header: 'Size', 
      render: (row) => `${row.ProductSize} ${row.ProductUnitType}` 
    },
    {
      header: 'Actions',
      className: 'w-24 text-right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            title="Edit"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Products</h1>
        <Button onClick={handleAdd}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Product
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
        searchPlaceholder="Search products or brands..."
      />

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productToEdit={editingProduct}
        onSave={fetchProducts}
      />
    </div>
  );
};

export default ProductsPage;
