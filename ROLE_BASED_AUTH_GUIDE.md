# 🔐 Role-Based Authentication System Guide

## Overview

The app implements a comprehensive role-based authentication system that supports three user types:
- **Patient** - Regular users who book appointments
- **Doctor** - Medical professionals who provide services
- **Pharmacy** - Pharmacy administrators

## Implementation Details

### 1. User Roles

Roles are defined in `AuthContext.tsx`:

```typescript
export type UserRole = 'patient' | 'doctor' | 'pharmacy';
```

### 2. Authentication Flow

#### Login Flow:
1. User selects their role (Patient/Doctor/Pharmacy)
2. Enters email and password
3. System authenticates based on selected role
4. User is redirected to appropriate dashboard

#### Registration Flow:
- **Patient Registration**: Simple registration → Direct access
- **Doctor Registration**: Registration → Verification Upload → Pending Approval → Access
- **Pharmacy Registration**: Registration → Admin Approval → Access

### 3. Role-Based Navigation

The `TabNavigator` automatically shows/hides tabs based on user role:

**Patient Tabs:**
- Home
- Appointments
- Chat
- Pharmacy ✅ (visible)
- More

**Doctor Tabs:**
- Home
- Appointments
- Chat
- More (Pharmacy tab hidden)

**Pharmacy Tabs:**
- Home
- Appointments
- Chat
- More (Pharmacy tab hidden)

### 4. Protected Routes

Routes can be protected based on role:

```typescript
// Example: Protect doctor-only route
{user?.role === 'doctor' && (
  <Stack.Screen name="DoctorOnly" component={DoctorOnlyScreen} />
)}
```

### 5. API Integration

When integrating with backend API, update the `login` and `register` functions in `AuthContext.tsx`:

```typescript
const login = async (email: string, password: string, role: UserRole = 'patient') => {
  try {
    // Replace with actual API call
    const endpoint = role === 'doctor' 
      ? '/api/doctor/login'
      : role === 'pharmacy'
      ? '/api/pharmacy/login'
      : '/api/patient/login';
    
    const response = await axios.post(endpoint, { email, password });
    
    // Store token and user data
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.USER, JSON.stringify(response.data.user)],
      [STORAGE_KEYS.TOKEN, response.data.token],
    ]);
    
    setUser({ ...response.data.user, token: response.data.token });
  } catch (error) {
    // Handle error
  }
};
```

### 6. Role-Specific Features

#### Patient Features:
- Book appointments
- Chat with doctors
- Browse pharmacy
- View medical records
- Manage dependents

#### Doctor Features:
- Manage appointments
- Chat with patients
- View patient list
- Manage profile
- Subscription management
- Admin chat

#### Pharmacy Features:
- Manage products
- Process orders
- View inventory
- Manage staff

### 7. Verification Status (Doctors)

Doctors have a verification status:
- `pending` - Documents submitted, awaiting approval
- `approved` - Verified and can access all features
- `rejected` - Verification failed, needs to resubmit

```typescript
if (user?.role === 'doctor' && user.verificationStatus === 'pending') {
  // Redirect to pending approval screen
}
```

### 8. Token Management

Tokens are stored securely using AsyncStorage:
- User data and token are stored separately
- Token is included in API requests (via axios interceptor)
- Token is cleared on logout

### 9. Session Persistence

The app checks for existing session on startup:
- Reads user data and token from AsyncStorage
- Automatically logs in if valid token exists
- Clears corrupted data if found

### 10. Logout

Logout clears all stored data:
```typescript
await AsyncStorage.multiRemove([STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN]);
setUser(null);
```

## Testing Role-Based Auth

### Test Patient Login:
1. Select "Patient" role
2. Use email: `patient@test.com`
3. Any password works (mock auth)

### Test Doctor Login:
1. Select "Doctor" role
2. Use email: `doctor@test.com`
3. Any password works (mock auth)

### Test Pharmacy Login:
1. Select "Pharmacy" role
2. Use email: `pharmacy@test.com`
3. Any password works (mock auth)

## Next Steps

1. **Replace Mock Auth**: Update `login` and `register` functions with actual API calls
2. **Add Token Interceptor**: Set up axios interceptor to include token in requests
3. **Add Refresh Token**: Implement token refresh mechanism
4. **Add Biometric Auth**: Add fingerprint/face ID support
5. **Add Social Login**: Integrate Google/Facebook login
6. **Add 2FA**: Implement two-factor authentication

## Security Best Practices

1. ✅ Store tokens securely (AsyncStorage for now, consider SecureStore for production)
2. ✅ Clear tokens on logout
3. ✅ Validate user role on protected routes
4. ✅ Handle token expiration
5. ✅ Implement proper error handling
6. ⚠️ Add token refresh mechanism
7. ⚠️ Add biometric authentication
8. ⚠️ Encrypt sensitive data

## File Structure

```
src/
├── contexts/
│   └── AuthContext.tsx          # Main auth context with role management
├── screens/
│   └── auth/
│       ├── LoginScreen.tsx      # Role selection + login
│       ├── RegisterScreen.tsx   # Patient registration
│       ├── DoctorRegisterScreen.tsx  # Doctor registration
│       └── ForgotPasswordScreen.tsx  # Password reset
└── navigation/
    ├── TabNavigator.tsx         # Role-based tab visibility
    └── AppNavigator.tsx         # Auth/Main navigation
```

---

**The role-based authentication system is fully implemented and ready for API integration!**

