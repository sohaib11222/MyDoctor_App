import api from './api';

/**
 * Payment/Transaction API
 * For managing invoices and transactions
 */

export interface Transaction {
  _id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'REFUNDED';
  provider: string;
  providerReference?: string;
  doctorName?: string;
  relatedAppointmentId?: {
    _id: string;
    appointmentNumber: string;
    appointmentDate: string;
    appointmentTime?: string;
    doctorId?: string | {
      _id: string;
      fullName: string;
      profileImage?: string;
    };
    patientId?: {
      _id: string;
      fullName: string;
      profileImage?: string;
    };
  };
  relatedSubscriptionId?: string;
  relatedProductId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionsResponse {
  success: boolean;
  message: string;
  data: {
    transactions: Transaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface TransactionResponse {
  success: boolean;
  message: string;
  data: Transaction;
}

/**
 * Get transactions (for doctor - subscription payments)
 * @param params - Query parameters (page, limit)
 * @returns Promise<TransactionsResponse>
 */
export const getTransactions = async (params?: {
  page?: number;
  limit?: number;
}): Promise<TransactionsResponse> => {
  const response = await api.get('/payment/transactions', { params });
  return response;
};

/**
 * Get transaction by ID
 * @param transactionId - Transaction ID
 * @returns Promise<TransactionResponse>
 */
export const getTransactionById = async (transactionId: string): Promise<TransactionResponse> => {
  const response = await api.get(`/payment/transactions/${transactionId}`);
  return response;
};

/**
 * Process subscription payment
 * @param subscriptionPlanId - Subscription plan ID
 * @param amount - Payment amount
 * @param paymentMethod - Payment method (default: 'DUMMY')
 * @returns Promise<TransactionResponse>
 */
export const processSubscriptionPayment = async (
  subscriptionPlanId: string,
  amount: number,
  paymentMethod: string = 'DUMMY'
): Promise<TransactionResponse> => {
  const response = await api.post('/payment/subscription', {
    subscriptionPlanId,
    amount,
    paymentMethod,
  });
  return response;
};

/**
 * Process product payment
 * @param productId - Product ID
 * @param amount - Payment amount
 * @param paymentMethod - Payment method (default: 'DUMMY')
 * @returns Promise<TransactionResponse>
 */
export const processProductPayment = async (
  productId: string,
  amount: number,
  paymentMethod: string = 'DUMMY'
): Promise<TransactionResponse> => {
  const response = await api.post('/payment/product', {
    productId,
    amount,
    paymentMethod,
  });
  return response;
};

/**
 * Get patient payment history
 * @param params - Query parameters (status, fromDate, toDate, page, limit)
 * @returns Promise<TransactionsResponse>
 */
export const getPatientPaymentHistory = async (params?: {
  status?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}): Promise<TransactionsResponse> => {
  const response = await api.get('/patient/payments/history', { params });
  return response;
};

