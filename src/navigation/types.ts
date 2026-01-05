export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  DoctorRegister: undefined;
  DoctorVerificationUpload: undefined;
  PendingApproval: undefined;
};

export type TabParamList = {
  Home: undefined;
  Appointments: undefined;
  Chat: undefined;
  Pharmacy: undefined;
  More: undefined;
  // Pharmacy-specific tabs
  Dashboard?: undefined;
  Products?: undefined;
  Orders?: undefined;
};

export type HomeStackParamList = {
  HomeScreen: undefined;
  Search: undefined;
  DoctorProfile: { doctorId: string };
  DoctorGrid: undefined;
  MapView: undefined;
  Booking: { doctorId: string };
  PatientSearch?: undefined;
  PatientProfile?: { patientId: string };
};

export type AppointmentsStackParamList = {
  AppointmentsScreen: undefined;
  AppointmentDetails: { appointmentId: string };
  Booking: { doctorId: string };
  Checkout: undefined;
  BookingSuccess: undefined;
  StartAppointment: { appointmentId: string };
  AvailableTimings: undefined;
  AppointmentRequests: undefined;
  DoctorAppointmentsGrid: undefined;
  MyPatients: undefined;
};

export type ChatStackParamList = {
  ChatList: undefined;
  ChatDetail: { 
    chatId: string; 
    recipientName: string;
    conversationId?: string;
    appointmentId?: string;
    patientId?: string;
    doctorId?: string;
  };
  AdminChat: { 
    conversationId?: string;
    adminId?: string;
  };
};

export type PharmacyStackParamList = {
  PharmacyHome: undefined;
  PharmacySearch: undefined;
  PharmacyDetails: { pharmacyId: string };
  ProductCatalog: { sellerId?: string; sellerType?: 'DOCTOR' | 'PHARMACY' | 'ADMIN' } | undefined;
  ProductDetails: { productId: string };
  Cart: undefined;
  Checkout: undefined;
  OrderHistory: undefined;
  OrderDetails: { orderId: string };
  PaymentSuccess: { orderId?: string };
};

export type PharmacyDashboardStackParamList = {
  PharmacyDashboard: undefined;
};

export type ProductsStackParamList = {
  ProductList: undefined;
  AddProduct: undefined;
  EditProduct: { productId: string };
  ProductDetails: { productId: string };
};

export type OrdersStackParamList = {
  OrdersList: undefined;
  OrderDetails: { orderId: string };
  OrderStatus: { orderId: string };
};

export type MoreStackParamList = {
  MoreScreen: undefined;
  Profile: undefined;
  Settings: undefined;
  ProfileSettings?: undefined;
  PatientProfileSettings?: undefined;
  SocialLinks?: undefined;
  PharmacyProfile?: undefined;
  PharmacySettings?: undefined;
  PharmacyManagement?: undefined;
  PatientDashboard?: undefined;
  DoctorDashboard?: undefined;
  PharmacyDashboard?: undefined;
  MedicalRecords?: undefined;
  Dependents?: undefined;
  MyPatients?: undefined;
  Reviews?: undefined;
  Notifications: undefined;
  Favourites?: undefined;
  Invoices: undefined;
  Documents?: undefined;
  Subscription?: undefined;
  Announcements?: undefined;
  ChangePassword: undefined;
  TwoFactorAuth?: undefined;
  PharmacyOrders?: undefined;
  OrderHistory?: undefined;
  OrderDetails?: { orderId: string };
  AdminOrders?: undefined;
};

