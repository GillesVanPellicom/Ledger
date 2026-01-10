import React, { useState, useEffect, useCallback } from 'react';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import { PlusIcon, PencilIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';
import { db } from '../utils/db';
import ProductModal from '../components/products/ProductModal';
import StoreModal from '../components/stores/StoreModal';
import Tooltip from '../components/ui/Tooltip';
import { Product, Store } from '../types';
import { Header } from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import { cn } from '../utils/cn';

const ReferenceDataPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'stores'>('products');

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(true);
  const [productsTotalCount, setProductsTotalCount] = useState<number>(0);
  const [productsCurrentPage, setProductsCurrentPage] = useState<number>(1);
  const [productsSearchTerm, setProductsSearchTerm] = useState<string>('');
  const [productsPageSize, setProductsPageSize] = useState<number>(10);
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Stores state
  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState<boolean>(true);
  const [storesTotalCount, setStoresTotalCount] = useState<number>(0);
  const [storesCurrentPage, setStoresCurrentPage] = useState<number>(1);
  const [storesSearchTerm, setStoresSearchTerm] = useState<string>('');
  const [storesPageSize, setStoresPageSize] = useState<number>(10);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState<boolean>(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  const fetchProducts = useCallback(async () => {
    setProductsLoading(true);
    try {
      const offset = (productsCurrentPage - 1) * productsPageSize;
      let query = `
        SELECT p.*, u.ProductUnitType 
        FROM Products p
        LEFT JOIN ProductUnits u ON p.ProductUnitID = u.ProductUnitID
        WHERE p.ProductIsActive = 1
      `;
      const params: any[] = [];
      
      if (productsSearchTerm) {
        const keywords = productsSearchTerm.toLowerCase().split(/\s+/).filter(k => k.length > 0);
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
      const countResult = await db.queryOne<{ count: number }>(countQuery, params.slice(0, params.length - (productsSearchTerm ? (productsSearchTerm.toLowerCase().split(/\s+/).filter(k => k.length > 0).length * 2) : 0)));
      setProductsTotalCount(countResult ? countResult.count : 0);
      
      query += ` ORDER BY p.ProductName ASC LIMIT ? OFFSET ?`;
      params.push(productsPageSize, offset);
      
      const results = await db.query<Product>(query, params);
      setProducts(results);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setProductsLoading(false);
    }
  }, [productsCurrentPage, productsPageSize, productsSearchTerm]);

  const fetchStores = useCallback(async () => {
    setStoresLoading(true);
    try {
      const offset = (storesCurrentPage - 1) * storesPageSize;
      let query = `SELECT * FROM Stores`;
      const params: any[] = [];
      
      if (storesSearchTerm) {
        query += ` WHERE StoreName LIKE ?`;
        params.push(`%${storesSearchTerm}%`);
      }
      
      const countQuery = `SELECT COUNT(*) as count FROM (${query.replace('SELECT *', 'SELECT StoreID')})`;
      const countResult = await db.queryOne<{ count: number }>(countQuery, params);
      setStoresTotalCount(countResult ? countResult.count : 0);
      
      query += ` ORDER BY StoreName ASC LIMIT ? OFFSET ?`;
      params.push(storesPageSize, offset);
      
      const results = await db.query<Store>(query, params);
      setStores(results);
    } catch (error) {
      console.error("Failed to fetch stores:", error);
    } finally {
      setStoresLoading(false);
    }
  }, [storesCurrentPage, storesPageSize, storesSearchTerm]);

  useEffect(() => {
    if (activeTab === 'products') {
      fetchProducts();
    } else {
      fetchStores();
    }
  }, [activeTab, fetchProducts, fetchStores]);

  const handleAddProduct = () => {
    setEditingProduct(null);
    setIsProductModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleAddStore = () => {
    setEditingStore(null);
    setIsStoreModalOpen(true);
  };

  const handleEditStore = (store: Store) => {
    setEditingStore(store);
    setIsStoreModalOpen(true);
  };

  const productColumns = [
    { header: 'Name', accessor: 'ProductName', width: '40%' },
    { header: 'Brand', accessor: 'ProductBrand', width: '35%' },
    { header: 'Size', width: '15%', render: (row: Product) => `${row.ProductSize} ${row.ProductUnitType}` },
    {
      header: 'Actions',
      width: '10%',
      className: 'text-right',
      render: (row: Product) => (
        <div className="flex justify-end">
          <Tooltip content="Edit Product">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleEditProduct(row); }}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      )
    }
  ];

  const storeColumns = [
    { header: 'Name', accessor: 'StoreName', width: '80%' },
    { 
      header: 'Visibility', 
      width: '10%',
      className: 'text-center',
      render: (row: Store) => (
        <Tooltip content={row.StoreIsActive ? 'Shown in lists' : 'Hidden from lists'}>
          {row.StoreIsActive ? 
          <EyeIcon className="h-5 w-5 text-green inline-block" /> :
          <EyeSlashIcon className="h-5 w-5 text-gray-400 inline-block" />}
        </Tooltip>
      )
    },
    {
      header: '',
      width: '10%',
      className: 'text-right',
      render: (row: Store) => (
        <div className="flex justify-end">
          <Tooltip content="Edit Store">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleEditStore(row); }}
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      )
    }
  ];

  const renderActions = () => {
    if (activeTab === 'products') {
      return (
        <Tooltip content="Add Product">
          <Button variant="ghost" size="icon" onClick={handleAddProduct}>
            <PlusIcon className="h-5 w-5" />
          </Button>
        </Tooltip>
      );
    }
    return (
      <Tooltip content="Add Store">
        <Button variant="ghost" size="icon" onClick={handleAddStore}>
          <PlusIcon className="h-5 w-5" />
        </Button>
      </Tooltip>
    );
  };
  
  const renderTabs = () => {
    const tabs = [
      { id: 'products', label: 'Products' },
      { id: 'stores', label: 'Stores' },
    ];

    return (
      <nav className="flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'products' | 'stores')}
            className={cn(
              tab.id === activeTab
                ? 'border-accent text-accent'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600',
              'whitespace-nowrap px-1 border-b-2 font-medium text-sm'
            )}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    );
  };

  return (
    <div>
      <Header
        title="Reference Data"
        variant="tabs"
        tabs={renderTabs()}
        actions={renderActions()}
      />
      <PageWrapper>
        <div className="py-6">
          {activeTab === 'products' && (
            <DataTable
              data={products}
              columns={productColumns}
              totalCount={productsTotalCount}
              pageSize={productsPageSize}
              onPageSizeChange={setProductsPageSize}
              currentPage={productsCurrentPage}
              onPageChange={setProductsCurrentPage}
              onSearch={setProductsSearchTerm}
              searchable={true}
              loading={productsLoading}
            />
          )}
          {activeTab === 'stores' && (
            <DataTable
              data={stores}
              columns={storeColumns}
              totalCount={storesTotalCount}
              pageSize={storesPageSize}
              onPageSizeChange={setStoresPageSize}
              currentPage={storesCurrentPage}
              onPageChange={setStoresCurrentPage}
              onSearch={setStoresSearchTerm}
              searchable={true}
              loading={storesLoading}
            />
          )}
        </div>
      </PageWrapper>
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={editingProduct}
        onSave={fetchProducts}
      />
      <StoreModal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
        storeToEdit={editingStore}
        onSave={fetchStores}
      />
    </div>
  );
};

export default ReferenceDataPage;
