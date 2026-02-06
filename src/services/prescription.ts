import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE_URL } from '../config/api';

const STORAGE_KEYS = {
  TOKEN: 'token',
};

export interface PrescriptionMedication {
  name: string;
  strength?: string | null;
  form?: string | null;
  route?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  quantity?: string | null;
  refills?: number;
  instructions?: string | null;
  substitutionAllowed?: boolean;
  isPrn?: boolean;
}

export interface Prescription {
  _id: string;
  appointmentId: any;
  doctorId: any;
  patientId: any;
  issuedAt?: string;
  diagnosis?: string | null;
  clinicalNotes?: string | null;
  allergies?: string | null;
  medications?: PrescriptionMedication[];
  tests?: string[];
  advice?: string | null;
  followUp?: string | null;
  status?: 'DRAFT' | 'ISSUED';
  createdAt?: string;
  updatedAt?: string;
}

export interface PrescriptionResponse {
  success: boolean;
  message: string;
  data: Prescription;
}

export interface PrescriptionListResponse {
  success: boolean;
  message: string;
  data: {
    prescriptions: Prescription[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export const upsertPrescriptionForAppointment = async (
  appointmentId: string,
  data: {
    diagnosis?: string | null;
    clinicalNotes?: string | null;
    allergies?: string | null;
    medications?: PrescriptionMedication[];
    tests?: string[];
    advice?: string | null;
    followUp?: string | null;
    status?: 'DRAFT' | 'ISSUED';
  }
): Promise<PrescriptionResponse> => {
  const response = (await api.post(`/prescriptions/appointment/${appointmentId}`, data)) as unknown as PrescriptionResponse;
  return response;
};

export const getPrescriptionByAppointment = async (appointmentId: string): Promise<PrescriptionResponse> => {
  const response = (await api.get(`/prescriptions/appointment/${appointmentId}`)) as unknown as PrescriptionResponse;
  return response;
};

export const listMyPrescriptions = async (params: { page?: number; limit?: number } = {}): Promise<PrescriptionListResponse> => {
  const response = (await api.get('/prescriptions', { params })) as unknown as PrescriptionListResponse;
  return response;
};

export const downloadPrescriptionPdf = async (prescriptionId: string): Promise<{ uri: string; fileName: string }> => {
  const token = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
  if (!token) {
    throw new Error('Authentication token not found');
  }

  const fileName = `prescription-${prescriptionId}.pdf`;
  const fsAny = FileSystem as any;
  const downloadDir: string | null = fsAny.documentDirectory || fsAny.cacheDirectory || null;
  if (!downloadDir) {
    throw new Error('No file system directory available');
  }

  const fileUri = `${downloadDir}${fileName}`;
  const url = `${API_BASE_URL}/prescriptions/${prescriptionId}/pdf`;

  const result = await FileSystem.downloadAsync(url, fileUri, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return { uri: result.uri, fileName };
};
