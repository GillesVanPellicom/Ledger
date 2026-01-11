import React, { useState } from 'react';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import { PlusIcon, PencilIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';
import ProductModal from '../components/products/ProductModal';
import StoreModal from '../components/stores/StoreModal';
import Tooltip from '../components/ui/Tooltip';
import { Product, Store } from '../types';
import { Header } from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import { cn } from '../utils/cn';
import { useProducts, useStores, useInvalidateReferenceData } from '../hooks/useReferenceData';

const ReferenceDataPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'stores'>('products');
  const invalidateReferenceData = useInvalidateReferenceData();

  // Products state
  const [productsCurrentPage, setProductsCurrentPage] = useState<number>(1);
  const [productsSearchTerm, setProductsSearchTerm] = useState<string>('');
  const [productsPageSize, setProductsPageSize] = useState<number>(10);
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Stores state
  const [storesCurrentPage, setStoresCurrentPage] = useState<number>(1);
  const [storesSearchTerm, setStoresSearchTerm] = useState<string>('');
  const [storesPageSize, setStoresPageSize] = useState<number>(10);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState<boolean>(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);

  const { data: productsData, isLoading: productsLoading } = useProducts({
    page: productsCurrentPage,
    pageSize: productsPageSize,
    searchTerm: productsSearchTerm
  });

  const { data: storesData, isLoading: storesLoading } = useStores({
    page: storesCurrentPage,
    pageSize: storesPageSize,
    searchTerm: storesSearchTerm
  });

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

  const handleSave = () => {
    invalidateReferenceData();
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
              data={productsData?.products || []}
              columns={productColumns}
              totalCount={productsData?.totalCount || 0}
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
              data={storesData?.stores || []}
              columns={storeColumns}
              totalCount={storesData?.totalCount || 0}
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
        onSave={handleSave}
      />
      <StoreModal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
        storeToEdit={editingStore}
        onSave={handleSave}
      />
    </div>
  );
};

export default ReferenceDataPage;
