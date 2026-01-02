import api from './api';
import { API_BASE_URL } from '../config/api';

/**
 * Mapping Service
 * Handles all mapping-related API calls
 */

export interface NearbyClinic {
  clinicId: string;
  doctorId: string;
  doctorName: string;
  clinicName: string;
  address: string;
  city: string;
  phone: string;
  distance: number; // Distance in kilometers
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface ClinicLocation {
  clinicId: string;
  doctorId: string;
  doctorName: string;
  clinicName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  phone: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  timings?: Array<{
    dayOfWeek: string;
    startTime: string;
    endTime: string;
  }>;
  images?: string[];
}

export interface RouteInfo {
  distance: number;
  distanceUnit: string;
  estimatedTime: number;
  estimatedTimeUnit: string;
  routeSteps: Array<{
    instruction: string;
    distance: number;
  }>;
  from: {
    lat: number;
    lng: number;
  };
  to: {
    lat: number;
    lng: number;
  };
}

export interface NearbyClinicsParams {
  lat: number;
  lng: number;
  radius?: number; // Optional, default is 10km
}

/**
 * Get nearby clinics
 * @param params - Location parameters (lat, lng, radius)
 * @returns Promise<NearbyClinic[]>
 */
export const getNearbyClinics = async (params: NearbyClinicsParams): Promise<NearbyClinic[]> => {
  const { lat, lng, radius = 10 } = params;
  
  const response = await api.get('/mapping/nearby', {
    params: {
      lat,
      lng,
      radius,
    },
  });
  
  return response.data?.data || response.data || [];
};

/**
 * Get clinic location by ID
 * @param clinicId - Clinic ID
 * @returns Promise<ClinicLocation>
 */
export const getClinicLocation = async (clinicId: string): Promise<ClinicLocation> => {
  const response = await api.get(`/mapping/clinic/${clinicId}`);
  return response.data?.data || response.data;
};

/**
 * Get route from one location to another
 * @param from - Starting coordinates { lat, lng }
 * @param to - Destination coordinates { lat, lng }
 * @returns Promise<RouteInfo>
 */
export const getRoute = async (
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<RouteInfo> => {
  const response = await api.get('/mapping/route', {
    params: {
      fromLat: from.lat,
      fromLng: from.lng,
      toLat: to.lat,
      toLng: to.lng,
    },
  });
  
  return response.data?.data || response.data;
};

