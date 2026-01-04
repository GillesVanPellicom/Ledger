import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import { PlusIcon, PencilIcon } from '@heroicons/react/24/solid';
import { db } from '../utils/db';
import ProductModal from '../components/products/ProductModal';
import Tooltip from '../components/ui/Tooltip';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);

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
        const keywords = searchTerm.toLowerCase().split(/\s+/).filter(k => k.length > 0);
        if (keywords.length > 0) {
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
    { header: 'Name', accessor: 'ProductName', width: '40%' },
    { header: 'Brand', accessor: 'ProductBrand', width: '35%' },
    { header: 'Size', width: '15%', render: (row) => `${row.ProductSize} ${row.ProductUnitType}` },
    {
      header: 'Actions',
      width: '10%',
      className: 'text-right',
      render: (row) => (
        <div className="flex justify-end">
          <Tooltip content="Edit Product" align="end">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => { e.stopPropagation(); handleEdit(row); }}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
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
