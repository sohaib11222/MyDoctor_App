# Development Build Setup Guide

## Understanding Development Builds

When you install a **development build** from EAS, the app doesn't include the JavaScript bundle. Instead, it needs to connect to a **Metro bundler** (development server) to load your code.

This is different from a **production build**, which includes everything bundled inside the app.

## Current Situation

✅ **Build is successful** - Your EAS build completed successfully  
❌ **App can't load** - Because Metro bundler isn't running  
✅ **Backend is configured** - Already set to live backend in `src/config/api.ts`

## Solution: Start Metro Bundler

You have two options:

### Option 1: Connect to Local Metro Server (Recommended for Development)

1. **Start Metro bundler on your computer:**
   ```bash
   cd mydoctor-app
   npx expo start --dev-client
   ```

2. **Connect your phone:**
   - **If using USB**: Make sure USB debugging is enabled, then the app should auto-connect
   - **If using WiFi**: Make sure your phone and computer are on the same network
     - Scan the QR code shown in the terminal
     - Or enter the URL manually in the app (e.g., `http://192.168.1.100:8081`)

3. **In the app**: When you see the "Development Build" screen:
   - Tap "Connect" if you see the local server listed
   - Or tap "Scan QR Code" and scan the QR from your terminal
   - Or manually enter the Metro URL

### Option 2: Create a Production Build (For Testing Without Metro)

If you want to test the app without needing Metro running:

```bash
cd mydoctor-app
eas build --profile production --platform android
```

This creates a standalone APK with everything bundled, but it's larger and takes longer to build.

## Step-by-Step: Running the App

1. **Open terminal in your project:**
   ```bash
   cd E:\Doctor_Overall\mydoctor-app
   ```

2. **Start Metro bundler:**
   ```bash
   npx expo start --dev-client
   ```

3. **You'll see:**
   - A QR code in the terminal
   - A URL like `exp://192.168.1.100:8081`
   - Options to open on device

4. **On your phone:**
   - Open the installed app (mydoctor-app Development Build)
   - You should see the "Development Build" screen
   - Tap "Scan QR Code" and scan the QR from your terminal
   - Or tap "Connect" if the server appears automatically

5. **The app will:**
   - Connect to Metro
   - Download the JavaScript bundle
   - Load your app
   - Connect to the live backend (already configured)

## Troubleshooting

### "Unable to load script" Error

This means Metro isn't running or the app can't reach it.

**Fix:**
1. Make sure Metro is running: `npx expo start --dev-client`
2. Check your phone and computer are on the same WiFi network
3. If using USB, run: `adb reverse tcp:8081 tcp:8081`

### App Shows "Development Build" Screen But No Server

**Fix:**
1. Make sure Metro is running
2. Check the URL in Metro terminal
3. Manually enter the URL in the app (tap the input field and type the URL)

### Can't Connect via WiFi

**Fix:**
1. Make sure firewall allows port 8081
2. Try USB connection instead:
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```
3. Then in the app, connect to `http://localhost:8081`

## Backend Configuration

Your app is already configured to use the live backend:
- API URL: `https://mydoctoradmin.mydoctorplus.it/api`
- This is set in `src/config/api.ts`

Once Metro connects and loads the app, it will automatically use the live backend. No additional configuration needed!

## Quick Start Commands

```bash
# Start Metro bundler
cd mydoctor-app
npx expo start --dev-client

# If using USB, also run:
adb reverse tcp:8081 tcp:8081
```

Then scan the QR code or connect manually in the app.

## Production Build (Alternative)

If you want a standalone app without Metro:

```bash
eas build --profile production --platform android
```

This takes longer but creates a complete app that doesn't need Metro.
