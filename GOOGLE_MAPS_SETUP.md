# Google Maps API Key Setup

## The Problem

The app is crashing with error: `java.lang.IllegalStateException: API key not found`

This happens because `react-native-maps` requires a Google Maps API key for Android.

## Solution: Get and Configure Google Maps API Key

### Step 1: Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Maps SDK for Android
   - Maps SDK for iOS (if you plan to support iOS)
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy your API key

### Step 2: Configure API Key in app.json

Open `mydoctor-app/app.json` and replace the placeholder:

```json
"android": {
  "config": {
    "googleMaps": {
      "apiKey": "YOUR_ACTUAL_API_KEY_HERE"
    }
  }
}
```

### Step 3: Rebuild the App

After adding the API key, you need to rebuild the app:

```bash
cd mydoctor-app
eas build --profile development --platform android
```

Or if you're using local development:

```bash
npx expo prebuild --clean
npx expo run:android
```

## Alternative: Use Default Provider (No API Key Required)

If you don't want to use Google Maps API key, you can modify the MapView to use the default provider:

In `MapViewScreen.tsx`, change:

```typescript
provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
```

To:

```typescript
// Remove provider prop to use default (may have limitations)
// provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
```

**Note:** The default provider on Android may have limitations or may still require an API key depending on your setup.

## Security Note

⚠️ **Important:** Never commit your actual API key to version control!

1. Add `app.json` to `.gitignore` if it contains sensitive keys, OR
2. Use environment variables:
   - Create `.env` file: `GOOGLE_MAPS_API_KEY=your_key_here`
   - Add `.env` to `.gitignore`
   - Use a build script to inject the key during build

## Testing

After rebuilding with the API key:
1. Install the new build on your device
2. Open the MapView screen
3. The map should load without errors

## Troubleshooting

### Still getting API key error?
- Make sure you rebuilt the app after adding the key
- Check that the API key is correctly formatted (no extra spaces)
- Verify the API key is enabled for "Maps SDK for Android" in Google Cloud Console
- Check that your app's package name matches the one in Google Cloud Console restrictions (if any)

### Map not showing?
- Check device location permissions are granted
- Verify internet connection
- Check console logs for other errors
