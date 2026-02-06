import api from './api';

/**
 * Subscription API
 * For managing doctor subscriptions
 */

export interface SubscriptionPlan {
  _id: string;
  name: string;
  price: number;
  durationInDays: number;
  features: string[];
  status: 'ACTIVE' | 'INACTIVE';
  limits?: {
    privateConsultations: number | null;
    videoConsultations: number | null;
    chatSessions: number | null;
  } | null;
  crmAccess?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Subscription {
  subscriptionPlan: SubscriptionPlan | string;
  subscriptionExpiresAt: string;
  hasActiveSubscription: boolean;
  usage?: {
    privateConsultations: number;
    videoConsultations: number;
    chatSessions: number;
  };
  remaining?: {
    privateConsultations: number | null;
    videoConsultations: number | null;
    chatSessions: number | null;
  };
  window?: {
    start: string;
    end: string;
  };
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
  return response as unknown as SubscriptionResponse;
};

/**
 * Get doctor's current subscription plan
 */
export const getMySubscription = async (): Promise<SubscriptionResponse> => {
  const response = await api.get('/doctor/my-subscription');
  return response as unknown as SubscriptionResponse;
};

/**
 * List all available subscription plans (public)
 */
export const listSubscriptionPlans = async (params?: {
  isActive?: boolean;
}): Promise<SubscriptionPlansResponse> => {
  const response = await api.get('/subscription', { params });
  return response as unknown as SubscriptionPlansResponse;
};

/**
 * Get active subscription plans (public - alternative endpoint)
 */
export const getActivePlans = async (): Promise<SubscriptionPlansResponse> => {
  const response = await api.get('/admin/subscription-plan/active');
  return response as unknown as SubscriptionPlansResponse;
};

