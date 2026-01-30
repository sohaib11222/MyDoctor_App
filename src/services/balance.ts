import api from './api';

/**
 * Balance API Service
 * For managing doctor earnings and withdrawal requests
 */

export interface BalanceResponse {
  success: boolean;
  message: string;
  data: {
    balance: number;
  };
}

export interface WithdrawalRequest {
  _id: string;
  amount: number;
  paymentMethod: 'STRIPE' | 'BANK' | 'PAYPAL';
  paymentDetails: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalRequestsResponse {
  success: boolean;
  message: string;
  data: {
    requests: WithdrawalRequest[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

/**
 * Get user balance
 * @returns {Promise<BalanceResponse>} User balance info
 */
export const getBalance = async (): Promise<BalanceResponse> => {
  const response = await api.get('/balance');
  return response;
};

/**
 * Request withdrawal
 * @param amount - Amount to withdraw
 * @param paymentMethod - Payment method (e.g., 'STRIPE', 'BANK', 'PAYPAL')
 * @param paymentDetails - Payment details (account number, etc.)
 * @returns {Promise<any>} Withdrawal request
 */
export const requestWithdrawal = async (
  amount: number,
  paymentMethod: 'STRIPE' | 'BANK' | 'PAYPAL',
  paymentDetails: string
): Promise<any> => {
  const response = await api.post('/balance/withdraw/request', {
    amount,
    paymentMethod,
    paymentDetails,
  });
  return response;
};

/**
 * Get withdrawal requests
 * @param params - Query parameters (status, page, limit)
 * @returns {Promise<WithdrawalRequestsResponse>} Withdrawal requests and pagination
 */
export const getWithdrawalRequests = async (
  params: { status?: string; page?: number; limit?: number } = {}
): Promise<WithdrawalRequestsResponse> => {
  const response = await api.get('/balance/withdraw/requests', { params });
  return response;
};
