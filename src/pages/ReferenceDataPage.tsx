import React, { useState } from 'react';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import { Plus, Pencil, Eye, EyeOff } from 'lucide-react';
import ProductModal from '../components/products/ProductModal';
import StoreModal from '../components/stores/StoreModal';
import CategoryModal from '../components/categories/CategoryModal';
import IncomeCategoryModal from '../components/categories/IncomeCategoryModal';
import IncomeSourceModal from '../components/income/IncomeSourceModal';
import Tooltip from '../components/ui/Tooltip';
import { Product, Store, Category } from '../types';
import { Header } from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import { cn } from '../utils/cn';
import { useProducts, useStores, useCategories, useIncomeCategories, useIncomeSources, useInvalidateReferenceData } from '../hooks/useReferenceData';

const ReferenceDataPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'stores' | 'categories' | 'income-categories' | 'income-sources'>('products');
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

  // Income Categories state
  const [incomeCategoriesCurrentPage, setIncomeCategoriesCurrentPage] = useState<number>(1);
  const [incomeCategoriesSearchTerm, setIncomeCategoriesSearchTerm] = useState<string>('');
  const [incomeCategoriesPageSize, setIncomeCategoriesPageSize] = useState<number>(10);
  const [isIncomeCategoryModalOpen, setIsIncomeCategoryModalOpen] = useState<boolean>(false);
  const [editingIncomeCategory, setEditingIncomeCategory] = useState<any | null>(null);

  // Income Sources state
  const [incomeSourcesCurrentPage, setIncomeSourcesCurrentPage] = useState<number>(1);
  const [incomeSourcesSearchTerm, setIncomeSourcesSearchTerm] = useState<string>('');
  const [incomeSourcesPageSize, setIncomeSourcesPageSize] = useState<number>(10);
  const [isIncomeSourceModalOpen, setIsIncomeSourceModalOpen] = useState<boolean>(false);
  const [editingIncomeSource, setEditingIncomeSource] = useState<any | null>(null);

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

  const { data: incomeCategoriesData, isLoading: incomeCategoriesLoading } = useIncomeCategories({
    page: incomeCategoriesCurrentPage,
    pageSize: incomeCategoriesPageSize,
    searchTerm: incomeCategoriesSearchTerm,
    enabled: activeTab === 'income-categories'
  });

  const { data: incomeSourcesData, isLoading: incomeSourcesLoading } = useIncomeSources({
    page: incomeSourcesCurrentPage,
    pageSize: incomeSourcesPageSize,
    searchTerm: incomeSourcesSearchTerm,
    enabled: activeTab === 'income-sources'
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

  const handleAddIncomeCategory = () => {
    setEditingIncomeCategory(null);
    setIsIncomeCategoryModalOpen(true);
  };

  const handleEditIncomeCategory = (category: any) => {
    setEditingIncomeCategory(category);
    setIsIncomeCategoryModalOpen(true);
  };

  const handleAddIncomeSource = () => {
    setEditingIncomeSource(null);
    setIsIncomeSourceModalOpen(true);
  };

  const handleEditIncomeSource = (source: any) => {
    setEditingIncomeSource(source);
    setIsIncomeSourceModalOpen(true);
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
              <Pencil className="h-4 w-4" />
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
          <Eye className="h-5 w-5 text-green inline-block" /> :
          <EyeOff className="h-5 w-5 text-gray-400 inline-block" />}
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
              <Pencil className="h-4 w-4" />
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
          <Eye className="h-5 w-5 text-green inline-block" /> :
          <EyeOff className="h-5 w-5 text-gray-400 inline-block" />}
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
              <Pencil className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      )
    }
  ];

  const incomeCategoryColumns = [
    { header: 'Name', accessor: 'IncomeCategoryName', width: '80%' },
    { 
      header: 'Visibility', 
      width: '10%',
      className: 'text-center',
      render: (row: any) => (
        <Tooltip content={row.IncomeCategoryIsActive ? 'Shown in lists' : 'Hidden from lists'}>
          {row.IncomeCategoryIsActive ? 
          <Eye className="h-5 w-5 text-green inline-block" /> :
          <EyeOff className="h-5 w-5 text-gray-400 inline-block" />}
        </Tooltip>
      )
    },
    {
      header: '',
      width: '10%',
      className: 'text-right',
      render: (row: any) => (
        <div className="flex justify-end">
          <Tooltip content="Edit Income Category">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleEditIncomeCategory(row); }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </Tooltip>
        </div>
      )
    }
  ];

  const incomeSourceColumns = [
    { header: 'Name', accessor: 'IncomeSourceName', width: '80%' },
    { 
      header: 'Visibility', 
      width: '10%',
      className: 'text-center',
      render: (row: any) => (
        <Tooltip content={row.IncomeSourceIsActive ? 'Shown in lists' : 'Hidden from lists'}>
          {row.IncomeSourceIsActive ? 
          <Eye className="h-5 w-5 text-green inline-block" /> :
          <EyeOff className="h-5 w-5 text-gray-400 inline-block" />}
        </Tooltip>
      )
    },
    {
      header: '',
      width: '10%',
      className: 'text-right',
      render: (row: any) => (
        <div className="flex justify-end">
          <Tooltip content="Edit Income Source">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleEditIncomeSource(row); }}
            >
              <Pencil className="h-4 w-4" />
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
            <Plus className="h-5 w-5" />
          </Button>
        </Tooltip>
      );
    }
    if (activeTab === 'stores') {
      return (
        <Tooltip content="Add Store">
          <Button variant="ghost" size="icon" onClick={handleAddStore}>
            <Plus className="h-5 w-5" />
          </Button>
        </Tooltip>
      );
    }
    if (activeTab === 'categories') {
      return (
        <Tooltip content="Add Category">
          <Button variant="ghost" size="icon" onClick={handleAddCategory}>
            <Plus className="h-5 w-5" />
          </Button>
        </Tooltip>
      );
    }
    if (activeTab === 'income-categories') {
      return (
        <Tooltip content="Add Income Category">
          <Button variant="ghost" size="icon" onClick={handleAddIncomeCategory}>
            <Plus className="h-5 w-5" />
          </Button>
        </Tooltip>
      );
    }
    return (
      <Tooltip content="Add Income Source">
        <Button variant="ghost" size="icon" onClick={handleAddIncomeSource}>
          <Plus className="h-5 w-5" />
        </Button>
      </Tooltip>
    );
  };
  
  const renderTabs = () => {
    const tabs = [
      { id: 'products', label: 'Products' },
      { id: 'stores', label: 'Stores' },
      { id: 'categories', label: 'Expense Categories' },
      { id: 'income-categories', label: 'Income Categories' },
      { id: 'income-sources', label: 'Income Sources' },
    ];

    return (
      <nav className="flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
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
          {activeTab === 'income-categories' && (
            <DataTable
              data={incomeCategoriesData?.categories || []}
              columns={incomeCategoryColumns}
              totalCount={incomeCategoriesData?.totalCount || 0}
              pageSize={incomeCategoriesPageSize}
              onPageSizeChange={setIncomeCategoriesPageSize}
              currentPage={incomeCategoriesCurrentPage}
              onPageChange={setIncomeCategoriesCurrentPage}
              onSearch={setIncomeCategoriesSearchTerm}
              searchable={true}
              loading={incomeCategoriesLoading}
            />
          )}
          {activeTab === 'income-sources' && (
            <DataTable
              data={incomeSourcesData?.sources || []}
              columns={incomeSourceColumns}
              totalCount={incomeSourcesData?.totalCount || 0}
              pageSize={incomeSourcesPageSize}
              onPageSizeChange={setIncomeSourcesPageSize}
              currentPage={incomeSourcesCurrentPage}
              onPageChange={setIncomeSourcesCurrentPage}
              onSearch={setIncomeSourcesSearchTerm}
              searchable={true}
              loading={incomeSourcesLoading}
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
      <IncomeCategoryModal
        isOpen={isIncomeCategoryModalOpen}
        onClose={() => setIsIncomeCategoryModalOpen(false)}
        categoryToEdit={editingIncomeCategory}
        onSave={handleSave}
      />
      <IncomeSourceModal
        isOpen={isIncomeSourceModalOpen}
        onClose={() => setIsIncomeSourceModalOpen(false)}
        sourceToEdit={editingIncomeSource}
        onSave={handleSave}
      />
    </div>
  );
};

export default ReferenceDataPage;
