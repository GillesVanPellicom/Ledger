import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/solid';
import { db } from '../utils/db';
import ProductModal from '../components/products/ProductModal';
import { ConfirmModal } from '../components/ui/Modal';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Pagination & Search State
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const pageSize = 10;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  
  // Delete State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

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
      
      // Count query
      const countQuery = `SELECT COUNT(*) as count FROM (${query})`;
      const countResult = await db.queryOne(countQuery, params);
      setTotalCount(countResult.count);
      
      // Data query
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
    fetchProducts();
  }, [fetchProducts]);

  const handleAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      // Soft delete
      await db.execute(
        'UPDATE Products SET ProductIsActive = 0 WHERE ProductID = ?', 
        [productToDelete.ProductID]
      );
      fetchProducts();
      setDeleteModalOpen(false);
      setProductToDelete(null);
    } catch (error) {
      console.error("Failed to delete product:", error);
    }
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
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-danger hover:text-danger-hover hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={(e) => { e.stopPropagation(); handleDeleteClick(row); }}
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
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
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onSearch={(term) => {
          setSearchTerm(term);
          setCurrentPage(1); // Reset to page 1 on search
        }}
        loading={loading}
        searchPlaceholder="Search products or brands..."
      />

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productToEdit={editingProduct}
        onSave={fetchProducts}
      />

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.ProductName}"? This will not affect existing receipts.`}
      />
    </div>
  );
};

export default ProductsPage;
