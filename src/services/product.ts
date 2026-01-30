import api from './api';

/**
 * Product API Service
 * For managing products (doctors can create products linked to their pharmacy)
 */

export interface Product {
  _id: string;
  name: string;
  price: number;
  discountPrice?: number;
  stock: number;
  description?: string;
  sku?: string;
  category?: string;
  subCategory?: string;
  tags?: string[];
  images?: string[];
  isActive: boolean;
  sellerId?: string;
  sellerType?: 'DOCTOR' | 'PHARMACY' | 'ADMIN';
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductFilters {
  sellerId?: string;
  sellerType?: 'DOCTOR' | 'PHARMACY' | 'ADMIN';
  category?: string;
  subCategory?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ProductListResponse {
  success: boolean;
  message: string;
  data: {
    products: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface ProductResponse {
  success: boolean;
  message: string;
  data: Product;
}

export interface CreateProductData {
  name: string;
  price: number;
  stock: number;
  description?: string;
  sku?: string;
  discountPrice?: number;
  category?: string;
  subCategory?: string;
  tags?: string[];
  images?: string[];
  isActive?: boolean;
}

export interface UpdateProductData extends Partial<CreateProductData> {}

/**
 * List products with filtering
 */
export const listProducts = async (params: ProductFilters = {}): Promise<ProductListResponse> => {
  const response: ProductListResponse = await api.get('/products', { params });
  return response;
};

/**
 * Get product by ID
 */
export const getProductById = async (id: string): Promise<ProductResponse> => {
  const response: ProductResponse = await api.get(`/products/${id}`);
  return response;
};

/**
 * Create product (automatically linked to doctor's pharmacy)
 */
export const createProduct = async (data: CreateProductData): Promise<ProductResponse> => {
  const response: ProductResponse = await api.post('/products', data);
  return response;
};

/**
 * Update product
 */
export const updateProduct = async (id: string, data: UpdateProductData): Promise<ProductResponse> => {
  const response: ProductResponse = await api.put(`/products/${id}`, data);
  return response;
};

/**
 * Delete product
 */
export const deleteProduct = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response: { success: boolean; message: string } = await api.delete(`/products/${id}`);
  return response;
};

