import api from './api';

/**
 * Order API Service
 * For managing product orders
 */

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country: string;
  zip: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  patientId: string | {
    _id: string;
    fullName: string;
    email: string;
    phone?: string;
  };
  pharmacyId: string | {
    _id: string;
    name: string;
    logo?: string;
  };
  ownerId: string | {
    _id: string;
    fullName: string;
    email: string;
  };
  items: Array<{
    productId: string | {
      _id: string;
      name: string;
      images?: string[];
      price: number;
      discountPrice?: number;
    };
    quantity: number;
    price: number;
    discountPrice?: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  shipping: number;
  initialShipping?: number;
  finalShipping?: number;
  shippingUpdatedAt?: string;
  total: number;
  initialTotal?: number;
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
  paymentStatus: 'PENDING' | 'PAID' | 'PARTIAL' | 'REFUNDED';
  paymentMethod?: string;
  transactionId?: string;
  shippingAddress?: ShippingAddress;
  notes?: string;
  deliveredAt?: string;
  requiresPaymentUpdate?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderData {
  items: OrderItem[];
  shippingAddress?: ShippingAddress;
  paymentMethod?: string;
}

export interface OrderResponse {
  success: boolean;
  message: string;
  data: Order;
}

export interface OrdersResponse {
  success: boolean;
  message: string;
  data: {
    orders: Order[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

/**
 * Create order
 * @param data - Order data
 * @returns Promise<OrderResponse>
 */
export const createOrder = async (data: CreateOrderData): Promise<OrderResponse> => {
  // Only include shippingAddress if it's provided
  const requestData: any = {
    items: data.items,
  };
  
  if (data.shippingAddress) {
    requestData.shippingAddress = data.shippingAddress;
  }
  
  if (data.paymentMethod) {
    requestData.paymentMethod = data.paymentMethod;
  }
  
  const response = await api.post('/orders', requestData);
  return response;
};

/**
 * Get order by ID
 * @param orderId - Order ID
 * @returns Promise<OrderResponse>
 */
export const getOrderById = async (orderId: string): Promise<OrderResponse> => {
  const response = await api.get(`/orders/${orderId}`);
  return response;
};

/**
 * Get patient orders
 * @param params - Query parameters (status, page, limit)
 * @returns Promise<OrdersResponse>
 */
export const getPatientOrders = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<OrdersResponse> => {
  const response = await api.get('/orders', { params });
  return response;
};

/**
 * Get pharmacy orders (for pharmacy owner/doctor)
 * @param params - Query parameters (status, page, limit)
 * @returns Promise<OrdersResponse>
 */
export const getPharmacyOrders = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<OrdersResponse> => {
  // Use /orders endpoint which routes to getPharmacyOrders for doctors
  const response = await api.get('/orders', { params });
  return response;
};

/**
 * Update order status (for pharmacy owner/admin)
 * @param orderId - Order ID
 * @param status - New status
 * @returns Promise<OrderResponse>
 */
export const updateOrderStatus = async (
  orderId: string,
  status: Order['status']
): Promise<OrderResponse> => {
  const response = await api.put(`/orders/${orderId}/status`, { status });
  return response;
};

/**
 * Cancel order
 * @param orderId - Order ID
 * @returns Promise<OrderResponse>
 */
export const cancelOrder = async (orderId: string): Promise<OrderResponse> => {
  const response = await api.post(`/orders/${orderId}/cancel`);
  return response;
};

/**
 * Get all orders (for admin)
 * @param params - Query parameters (status, page, limit)
 * @returns Promise<OrdersResponse>
 */
export const getAllOrders = async (params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<OrdersResponse> => {
  const response = await api.get('/admin/orders', { params });
  return response;
};

/**
 * Update shipping fee (for pharmacy owner/admin)
 * @param orderId - Order ID
 * @param shippingFee - New shipping fee
 * @returns Promise<OrderResponse>
 */
export const updateShippingFee = async (
  orderId: string,
  shippingFee: number
): Promise<OrderResponse> => {
  const response = await api.put(`/orders/${orderId}/shipping`, { shippingFee });
  return response;
};

/**
 * Pay for order (for patient - including shipping difference if any)
 * @param orderId - Order ID
 * @param paymentMethod - Payment method
 * @returns Promise<any>
 */
export const payForOrder = async (
  orderId: string,
  paymentMethod: string = 'DUMMY'
): Promise<any> => {
  const response = await api.post(`/orders/${orderId}/pay`, { paymentMethod });
  return response;
};

/**
 * Process order payment (legacy - use payForOrder instead)
 * @param orderId - Order ID
 * @param paymentMethod - Payment method
 * @returns Promise<any>
 */
export const processOrderPayment = async (
  orderId: string,
  paymentMethod: string = 'DUMMY'
): Promise<any> => {
  const response = await api.post('/payment/order', {
    orderId,
    paymentMethod,
  });
  return response;
};

