import api from './api';

export interface PharmacySubscriptionPlan {
  _id: string;
  name: string;
  price: number;
  durationInDays: number;
  features?: string[];
  status: 'ACTIVE' | 'INACTIVE';
  targetRole?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PharmacySubscription {
  subscriptionPlan: PharmacySubscriptionPlan | string | null;
  subscriptionExpiresAt: string | null;
  hasActiveSubscription: boolean;
  window?: {
    start: string;
    end: string;
  };
}

export interface PharmacySubscriptionResponse {
  success: boolean;
  message: string;
  data: PharmacySubscription;
}

export interface PharmacySubscriptionPlansResponse {
  success: boolean;
  message: string;
  data: PharmacySubscriptionPlan[];
}

export const getPharmacyActivePlans = async (): Promise<PharmacySubscriptionPlansResponse> => {
  const response = await api.get('/admin/subscription-plan/active', { params: { targetRole: 'PHARMACY' } });
  return response as unknown as PharmacySubscriptionPlansResponse;
};

export const getMyPharmacySubscription = async (): Promise<PharmacySubscriptionResponse> => {
  const response = await api.get('/pharmacy/my-subscription');
  return response as unknown as PharmacySubscriptionResponse;
};

export const buyPharmacySubscriptionPlan = async (planId: string): Promise<any> => {
  const response = await api.post('/pharmacy/buy-subscription', { planId });
  return response;
};
