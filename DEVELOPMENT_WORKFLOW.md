# Development Workflow Guide

## Understanding the Two Build Types

### 1. **Development Build** (For Development)
- ✅ Connects to Metro bundler
- ✅ Shows live changes as you code
- ✅ Hot reload works
- ❌ Requires Metro running on your computer
- **Use this for:** Active development and testing changes

### 2. **Production Build** (For Testing/Release)
- ✅ Standalone - works without Metro
- ✅ All code bundled inside
- ❌ Doesn't connect to Metro
- ❌ Changes require rebuilding
- **Use this for:** Final testing and release

## Current Situation

You installed a **production build**, but you're trying to use it with Expo/Metro for development. This won't work because:
- Production builds don't connect to Metro
- They're meant to be standalone
- WebRTC native module error appears because Metro can't find it in the bundled app

## Solution: Use Development Build for Development

### Step 1: Build Development Version

```bash
cd E:\Doctor_Overall\mydoctor-app
eas build --profile development --platform android
```

This creates a development build that **can** connect to Metro.

### Step 2: Install the Development Build

Install the APK from the EAS build link (development builds are APK by default).

### Step 3: Start Metro Bundler

```bash
cd E:\Doctor_Overall\mydoctor-app
npx expo start --dev-client
```

### Step 4: Connect App to Metro

In the app:
1. You'll see the "Development Build" screen
2. Tap "Scan QR Code" or "Connect"
3. Scan the QR code from your terminal
4. App will load and connect to Metro

### Step 5: Make Changes and See Them Live

Now when you:
- Edit code files
- Save changes
- Metro will reload automatically
- App will update with your changes (hot reload)

## Quick Reference

### For Development (Making Changes):
```bash
# 1. Build development version (once)
eas build --profile development --platform android

# 2. Install the APK on your device

# 3. Start Metro (every time you develop)
npx expo start --dev-client

# 4. Connect app to Metro (scan QR code)
# 5. Make changes - they appear live!
```

### For Testing Standalone (No Metro):
```bash
# Build production version
eas build --profile production --platform android

# Install APK - works standalone, no Metro needed
# But changes require rebuilding
```

## Troubleshooting

### "WebRTC native module not found" Error

**Cause:** Trying to use production build with Metro, or Metro not running

**Fix:**
1. Use development build for development: `eas build --profile development`
2. Make sure Metro is running: `npx expo start --dev-client`
3. Connect app to Metro (scan QR code)

### App Shows "Development Build" Screen But Can't Connect

**Fix:**
1. Make sure Metro is running
2. Check phone and computer are on same WiFi
3. Try USB connection:
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```
   Then connect to `http://localhost:8081` in the app

### Changes Not Appearing

**Fix:**
1. Make sure Metro is running
2. Check Metro terminal for errors
3. Try reloading app (shake device → Reload)
4. Check if file was saved

## Recommended Workflow

1. **First time setup:**
   - Build development version: `eas build --profile development --platform android`
   - Install on device

2. **Daily development:**
   - Start Metro: `npx expo start --dev-client`
   - Open app on device → Connect to Metro
   - Make changes → See them live!

3. **Final testing:**
   - Build production: `eas build --profile production --platform android`
   - Test standalone app (no Metro needed)

## Summary

- **Development Build** = For coding and seeing changes live (needs Metro)
- **Production Build** = For final testing/release (standalone, no Metro)

Use the **development build** when you want to make changes and see them instantly!
