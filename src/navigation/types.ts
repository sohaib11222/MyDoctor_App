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
  PharmacyRegister: undefined;
  PharmacyRegisterStep1: undefined;
  PharmacyRegisterStep2: undefined;
  PharmacyRegisterStep3: undefined;
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
};

export type ChatStackParamList = {
  ChatList: undefined;
  ChatDetail: { chatId: string; recipientName: string };
  VideoCall: { callId: string };
  AdminChat: undefined;
};

export type PharmacyStackParamList = {
  PharmacyHome: undefined;
  ProductCatalog: undefined;
  ProductDetails: { productId: string };
  Cart: undefined;
  Checkout: undefined;
  OrderHistory: undefined;
  PaymentSuccess: undefined;
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
  PharmacyProfile?: undefined;
  PharmacySettings?: undefined;
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
  ChangePassword?: undefined;
  TwoFactorAuth?: undefined;
};

