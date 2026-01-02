# API Configuration Guide

## Network Error Fix

If you're getting `Network Error` when trying to login or register, you need to configure the API base URL correctly for your device.

## Quick Fix

1. **Open** `mydoctor-app/src/config/api.ts`
2. **Update** the `API_BASE_URL` based on your setup:

### For Android Emulator
```typescript
// In src/config/api.ts, the Android URL should be:
return 'http://10.0.2.2:5000/api';
```

### For iOS Simulator
```typescript
// In src/config/api.ts, the iOS URL should be:
return 'http://localhost:5000/api';
```

### For Physical Device (Android or iOS)
You need to use your computer's IP address:

1. **Find your computer's IP address:**
   - **Windows**: Open CMD and run `ipconfig`, look for "IPv4 Address"
   - **Mac/Linux**: Run `ifconfig` or `ip addr`, look for your network interface IP
   - Example: `192.168.1.100`

2. **Update the API URL:**
   ```typescript
   // In src/config/api.ts
   return 'http://192.168.1.100:5000/api'; // Replace with your IP
   ```

3. **Make sure your phone and computer are on the same WiFi network**

4. **Make sure the backend server is running** on port 5000

## Testing the Connection

1. Make sure your backend is running:
   ```bash
   cd myDoctor
   npm start
   # Server should be running on http://localhost:5000
   ```

2. Test the API from your computer's browser:
   - Open: `http://localhost:5000/api/health` (if available)
   - Or: `http://localhost:5000/api/auth/login` (should return an error, but connection should work)

3. From your phone/emulator, test the connection:
   - Android Emulator: `http://10.0.2.2:5000/api/health`
   - iOS Simulator: `http://localhost:5000/api/health`
   - Physical Device: `http://YOUR_IP:5000/api/health`

## Common Issues

### Issue: "Network Error" on Android Emulator
**Solution**: Use `http://10.0.2.2:5000/api` instead of `localhost`

### Issue: "Network Error" on Physical Device
**Solution**: 
1. Use your computer's IP address (not localhost)
2. Make sure phone and computer are on same WiFi
3. Check firewall settings on your computer
4. Make sure backend is running

### Issue: "Connection Refused"
**Solution**: 
1. Make sure backend server is running
2. Check if port 5000 is correct
3. Check if backend is listening on all interfaces (0.0.0.0) not just localhost

### Issue: "CORS Error"
**Solution**: This shouldn't happen in React Native, but if it does, check backend CORS settings

## Environment Variables (Optional)

You can also use environment variables. Create a `.env` file in `mydoctor-app/`:

```env
API_BASE_URL=http://10.0.2.2:5000/api
```

Then install `react-native-config`:
```bash
npm install react-native-config
```

And update `src/config/api.ts` to read from environment variables.

