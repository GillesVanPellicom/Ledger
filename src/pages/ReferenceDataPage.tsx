import React, { useState } from 'react';
import DataTable from '../components/ui/DataTable';
import Button from '../components/ui/Button';
import { Plus, Pencil, Eye, EyeOff, Package, Tag } from 'lucide-react';
import ProductModal from '../components/products/ProductModal';
import CategoryModal from '../components/categories/CategoryModal';
import Tooltip from '../components/ui/Tooltip';
import { Product, Category } from '../types';
import { Header } from '../components/ui/Header';
import PageWrapper from '../components/layout/PageWrapper';
import { useProducts, useCategories, useInvalidateReferenceData } from '../hooks/useReferenceData';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/Tabs';

const ReferenceDataPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const invalidateReferenceData = useInvalidateReferenceData();

  // Products state
  const [productsCurrentPage, setProductsCurrentPage] = useState<number>(1);
  const [productsSearchTerm, setProductsSearchTerm] = useState<string>('');
  const [productsPageSize, setProductsPageSize] = useState<number>(10);
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

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
    { 
      header: 'Size', 
      width: '15%', 
      render: (row: Product) => {
        if (!row.ProductSize && !row.ProductUnitType) return '';
        return `${row.ProductSize || ''} ${row.ProductUnitType || ''}`.trim();
      } 
    },
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
    return (
      <Tooltip content="Add Category">
        <Button variant="ghost" size="icon" onClick={handleAddCategory}>
          <Plus className="h-5 w-5" />
        </Button>
      </Tooltip>
    );
  };
  
  const renderTabs = () => {
    return (
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList>
          <TabsTrigger value="products">
            <Package className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Tag className="h-4 w-4" />
            Categories
          </TabsTrigger>
        </TabsList>
      </Tabs>
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
