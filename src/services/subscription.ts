import api from './api';

/**
 * Subscription API
 * For managing doctor subscriptions
 */

export interface SubscriptionPlan {
  _id: string;
  name: string;
  description?: string;
  price: number;
  duration: number; // in days
  features: string[];
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface Subscription {
  _id: string;
  doctorId: string;
  subscriptionPlan: SubscriptionPlan | string;
  startDate: string;
  endDate: string;
  subscriptionExpiresAt: string;
  hasActiveSubscription: boolean;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionResponse {
  success: boolean;
  message: string;
  data: Subscription;
}

export interface SubscriptionPlansResponse {
  success: boolean;
  message: string;
  data: SubscriptionPlan[];
}

/**
 * Buy a subscription plan
 */
export const buySubscriptionPlan = async (planId: string): Promise<SubscriptionResponse> => {
  const response = await api.post('/doctor/buy-subscription', { planId });
  return response;
};

/**
 * Get doctor's current subscription plan
 */
export const getMySubscription = async (): Promise<SubscriptionResponse> => {
  const response = await api.get('/doctor/my-subscription');
  return response;
};

/**
 * List all available subscription plans (public)
 */
export const listSubscriptionPlans = async (params?: {
  isActive?: boolean;
}): Promise<SubscriptionPlansResponse> => {
  const response = await api.get('/subscription', { params });
  return response;
};

/**
 * Get active subscription plans (public - alternative endpoint)
 */
export const getActivePlans = async (): Promise<SubscriptionPlansResponse> => {
  const response = await api.get('/admin/subscription-plan/active');
  return response;
};

