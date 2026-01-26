# Video Calling Implementation Guide

This guide explains how video calling has been implemented in the mobile app and how to test it using EAS Build.

## Overview

The video calling functionality uses **Stream.io** video SDK, the same service used in the web app. This ensures consistency across platforms.

## Implementation Details

### 1. Dependencies Added

The following packages have been added to `package.json`:

- `@stream-io/video-react-native-sdk@^1.27.4`: Stream.io React Native SDK for video calling (latest version)
- `expo-camera@~16.0.8`: For camera permissions and access (compatible with Expo SDK 54)
- `expo-av@~16.0.8`: For audio/video handling (compatible with Expo SDK 54)

### 2. Files Created/Modified

#### New Files:
- `src/services/video.ts`: Video API service for backend communication
- `src/config/stream.ts`: Stream.io API key configuration
- `src/hooks/useVideoCall.ts`: Custom hook for video call management
- `src/screens/shared/VideoCallScreen.tsx`: Main video call screen component

#### Modified Files:
- `src/navigation/types.ts`: Added `VideoCall` route to `AppointmentsStackParamList`
- `src/navigation/stacks/AppointmentsStack.tsx`: Added VideoCall screen route
- `src/screens/shared/AppointmentDetailsScreen.tsx`: Added "Start Video Call" buttons
- `app.json`: Added camera and microphone permissions
- `package.json`: Added Stream.io dependencies

### 3. Flow Overview

1. **User clicks "Start Video Call"** from appointment details
2. **Permissions are requested** (camera and microphone)
3. **Backend API is called** (`/api/video/start`) with appointmentId
4. **Backend returns** Stream token and call ID
5. **Stream client is created** with user info and token
6. **Call is joined** and camera/microphone are enabled
7. **Video UI is displayed** with local and remote participant views
8. **User can toggle** microphone, camera, and end call
9. **On end call**, backend session is ended and user navigates back

## Testing with EAS Build

Since video calling requires native modules (camera, microphone), you **cannot test this with Expo Go**. You must use EAS Build to create a development or production build.

### Prerequisites

1. **EAS CLI installed globally**:
   ```bash
   npm install -g eas-cli
   ```

2. **EAS account** (free tier available):
   ```bash
   eas login
   ```

3. **Project configured** (already done - projectId in `app.json`)

### Step 1: Install Dependencies

First, install the new dependencies:

```bash
cd mydoctor-app
npm install
# or
yarn install
```

### Step 2: Configure EAS Build

Create or update `eas.json` in the `mydoctor-app` directory:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      },
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "ios": {
        "simulator": false
      },
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### Step 3: Build Development Client

Build a development client for testing:

**For Android:**
```bash
cd mydoctor-app
eas build --profile development --platform android
```

**For iOS:**
```bash
cd mydoctor-app
eas build --profile development --platform ios
```

**For both:**
```bash
eas build --profile development --platform all
```

This will:
- Upload your code to EAS servers
- Build the app with native modules included
- Provide you with a download link (APK for Android, IPA for iOS)

### Step 4: Install the Build

1. **Download the build** from the EAS dashboard or the link provided
2. **Install on your device**:
   - **Android**: Transfer APK to device and install, or use the download link directly on your device
   - **iOS**: Install via TestFlight (if configured) or use the download link

### Step 5: Test Video Calling

#### Test Scenario 1: Single Device Test
1. Open the app on your device
2. Login as a patient or doctor
3. Navigate to an appointment with status "CONFIRMED" and bookingType "ONLINE"
4. Click "Start Video Call"
5. Grant camera and microphone permissions when prompted
6. Verify:
   - Local video appears (your own video)
   - Call connects successfully
   - Controls work (mute, camera toggle, end call)

#### Test Scenario 2: Two Device Test (Recommended)
1. **Device 1 (Doctor)**:
   - Login as a doctor
   - Navigate to a confirmed ONLINE appointment
   - Click "Start Video Call"
   - Grant permissions

2. **Device 2 (Patient)**:
   - Login as a patient
   - Navigate to the same appointment
   - Click "Start Video Call"
   - Grant permissions

3. **Verify**:
   - Both devices show local video
   - Both devices show remote video (the other participant)
   - Audio works both ways
   - Controls work on both devices
   - Ending call on one device properly disconnects both

#### Test Scenario 3: Permission Denial
1. Deny camera permission
2. Verify error message is shown
3. Verify user can retry after granting permission

#### Test Scenario 4: Network Issues
1. Start a call
2. Disable WiFi/data
3. Verify graceful error handling
4. Re-enable network
5. Verify call can reconnect or user can start new call

### Step 6: Production Build (After Testing)

Once development testing is complete, create a production build:

```bash
eas build --profile production --platform android
# or
eas build --profile production --platform ios
# or
eas build --profile production --platform all
```

## Troubleshooting

### Issue: Build fails with Stream.io SDK errors
**Solution**: Ensure you're using the correct version of `@stream-io/video-react-native-sdk` compatible with your Expo SDK version.

### Issue: Camera/microphone not working
**Solution**: 
- Verify permissions are granted in device settings
- Check `app.json` has correct permission descriptions
- Ensure you're testing on a physical device (simulators may not support camera)

### Issue: Call doesn't connect
**Solution**:
- Check backend API is accessible
- Verify Stream API key is correct in `src/config/stream.ts`
- Check network connectivity
- Review console logs for error messages

### Issue: Video shows but no audio
**Solution**:
- Check device volume is not muted
- Verify microphone permission is granted
- Check if microphone is enabled in call controls

### Issue: Build takes too long
**Solution**: 
- Use `--local` flag for local builds (requires local build environment setup)
- Or wait for EAS cloud build (usually 10-20 minutes)

## Important Notes

1. **Expo Go won't work**: Video calling requires native modules, so you must use EAS Build
2. **Physical devices recommended**: Simulators may not support camera/microphone properly
3. **Network required**: Video calls require stable internet connection
4. **Backend must be running**: The app calls `/api/video/start` endpoint which must be accessible
5. **Stream.io account**: Ensure your Stream.io API key is valid and has video calling enabled

## Environment Variables

If you need to use a different Stream API key, you can add it to your environment:

1. Create `.env` file in `mydoctor-app/`:
   ```
   STREAM_API_KEY=your_api_key_here
   ```

2. Update `src/config/stream.ts` to read from environment:
   ```typescript
   export const STREAM_API_KEY = process.env.STREAM_API_KEY || '3cp572t2hewb';
   ```

3. Install `react-native-dotenv` if needed:
   ```bash
   npm install react-native-dotenv
   ```

## Next Steps

After successful testing:
1. Create production builds for app store submission
2. Test on multiple devices and network conditions
3. Monitor Stream.io dashboard for call quality metrics
4. Consider adding call recording features (if needed)
5. Add push notifications for incoming calls (future enhancement)

## Support

For Stream.io specific issues, refer to:
- Stream.io React Native SDK docs: https://getstream.io/video/docs/react-native/
- Stream.io support: https://getstream.io/support/

For EAS Build issues:
- EAS Build docs: https://docs.expo.dev/build/introduction/
- Expo Discord: https://chat.expo.dev/
