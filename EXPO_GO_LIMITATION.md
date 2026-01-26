# Expo Go Limitation with Video Calling

## The Problem

**Expo Go cannot run apps with custom native modules** like:
- Stream.io Video SDK (WebRTC)
- Custom native code
- Native modules not included in Expo Go

This is why you're seeing: `"WebRTC native module not found"`

## Why This Happens

Expo Go is a pre-built app that only includes:
- ✅ Standard Expo SDK modules
- ✅ JavaScript-only packages
- ❌ **NOT** custom native modules (like Stream.io SDK)

Your app now uses `@stream-io/video-react-native-sdk` which requires native WebRTC code that Expo Go doesn't have.

## Your Options

### Option 1: Use Development Build (Recommended)

This is like Expo Go but includes your native modules:

```bash
# Build once
eas build --profile development --platform android

# Then use like Expo Go:
npx expo start --dev-client
# Scan QR code in the app
# Make changes - see them live!
```

**Pros:**
- ✅ Works with video calling
- ✅ Hot reload like Expo Go
- ✅ Can make changes and see them live

**Cons:**
- ❌ Need to build once (takes 10-15 minutes)
- ❌ Can't use Expo Go app

### Option 2: Temporarily Remove Video Calling for Expo Go

If you want to use Expo Go for other features:

1. Comment out video calling imports
2. Remove video call buttons/navigation
3. Use Expo Go normally
4. Re-enable when you need to test video

**Pros:**
- ✅ Can use Expo Go
- ✅ Fast development

**Cons:**
- ❌ Can't test video calling
- ❌ Need to remember to re-enable

### Option 3: Use Expo Go for Non-Video Features

Keep video calling disabled in code, use Expo Go for everything else, and only test video with development build.

## Recommendation

**Use Development Build** - It works exactly like Expo Go but supports your native modules:

1. Build once: `eas build --profile development --platform android`
2. Install the APK
3. Use `npx expo start --dev-client` (same as Expo Go workflow)
4. Scan QR code and develop normally

The only difference is you install a custom app instead of Expo Go, but the development experience is identical!

## Quick Comparison

| Feature | Expo Go | Development Build |
|---------|---------|-------------------|
| Hot Reload | ✅ | ✅ |
| Fast Refresh | ✅ | ✅ |
| QR Code Connect | ✅ | ✅ |
| Native Modules | ❌ | ✅ |
| Video Calling | ❌ | ✅ |
| Custom Native Code | ❌ | ✅ |
| Initial Setup | Instant | 10-15 min build |

## Bottom Line

**You can't use Expo Go with video calling** because it requires native modules. But **development builds work exactly like Expo Go** - same workflow, same experience, just with your native modules included!

Would you like me to help you set up the development build workflow, or temporarily disable video calling so you can use Expo Go?
