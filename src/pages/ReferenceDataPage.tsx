import React, { useState } from 'react';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import { PlusIcon, PencilIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';
import ProductModal from '../components/products/ProductModal';
import StoreModal from '../components/stores/StoreModal';
import CategoryModal from '../components/categories/CategoryModal';
import Tooltip from '../components/ui/Tooltip';
import { Product, Store, Category } from '../types';
import { Header } from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import { cn } from '../utils/cn';
import { useProducts, useStores, useCategories, useInvalidateReferenceData } from '../hooks/useReferenceData';

const ReferenceDataPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'stores' | 'categories'>('products');
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

  // Categories state
  const [categoriesCurrentPage, setCategoriesCurrentPage] = useState<number>(1);
  const [categoriesSearchTerm, setCategoriesSearchTerm] = useState<string>('');
  const [categoriesPageSize, setCategoriesPageSize] = useState<number>(10);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { data: productsData, isLoading: productsLoading } = useProducts({
    page: productsCurrentPage,
    pageSize: productsPageSize,
    searchTerm: productsSearchTerm,
    enabled: activeTab === 'products'
  });

  const { data: storesData, isLoading: storesLoading } = useStores({
    page: storesCurrentPage,
    pageSize: storesPageSize,
    searchTerm: storesSearchTerm,
    enabled: activeTab === 'stores'
  });

  const { data: categoriesData, isLoading: categoriesLoading } = useCategories({
    page: categoriesCurrentPage,
    pageSize: categoriesPageSize,
    searchTerm: categoriesSearchTerm,
    enabled: activeTab === 'categories'
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

  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setIsCategoryModalOpen(true);
  };

  const handleSave = () => {
    invalidateReferenceData();
  };

  const productColumns = [
    { header: 'Name', accessor: 'ProductName', width: '30%' },
    { header: 'Brand', accessor: 'ProductBrand', width: '25%' },
    { header: 'Size', width: '15%', render: (row: Product) => `${row.ProductSize} ${row.ProductUnitType}` },
    { header: 'Category', accessor: 'CategoryName', width: '20%' },
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

  const categoryColumns = [
    { header: 'Name', accessor: 'CategoryName', width: '80%' },
    { 
      header: 'Visibility', 
      width: '10%',
      className: 'text-center',
      render: (row: Category) => (
        <Tooltip content={row.CategoryIsActive ? 'Shown in lists' : 'Hidden from lists'}>
          {row.CategoryIsActive ? 
          <EyeIcon className="h-5 w-5 text-green inline-block" /> :
          <EyeSlashIcon className="h-5 w-5 text-gray-400 inline-block" />}
        </Tooltip>
      )
    },
    {
      header: '',
      width: '10%',
      className: 'text-right',
      render: (row: Category) => (
        <div className="flex justify-end">
          <Tooltip content="Edit Category">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleEditCategory(row); }}
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
    if (activeTab === 'stores') {
      return (
        <Tooltip content="Add Store">
          <Button variant="ghost" size="icon" onClick={handleAddStore}>
            <PlusIcon className="h-5 w-5" />
          </Button>
        </Tooltip>
      );
    }
    return (
      <Tooltip content="Add Category">
        <Button variant="ghost" size="icon" onClick={handleAddCategory}>
          <PlusIcon className="h-5 w-5" />
        </Button>
      </Tooltip>
    );
  };
  
  const renderTabs = () => {
    const tabs = [
      { id: 'products', label: 'Products' },
      { id: 'stores', label: 'Stores' },
      { id: 'categories', label: 'Categories' },
    ];

    return (
      <nav className="flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'products' | 'stores' | 'categories')}
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
          {activeTab === 'categories' && (
            <DataTable
              data={categoriesData?.categories || []}
              columns={categoryColumns}
              totalCount={categoriesData?.totalCount || 0}
              pageSize={categoriesPageSize}
              onPageSizeChange={setCategoriesPageSize}
              currentPage={categoriesCurrentPage}
              onPageChange={setCategoriesCurrentPage}
              onSearch={setCategoriesSearchTerm}
              searchable={true}
              loading={categoriesLoading}
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
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categoryToEdit={editingCategory}
        onSave={handleSave}
      />
    </div>
  );
};

export default ReferenceDataPage;
