# Quick Start: Running Your Development Build

## The Issue

Your development build is installed, but it needs to connect to a **Metro bundler** (development server) to load the JavaScript code. This is normal for development builds!

## Quick Solution (3 Steps)

### Step 1: Start Metro Bundler

Open terminal in your project and run:

```bash
cd E:\Doctor_Overall\mydoctor-app
npx expo start --dev-client
```

You'll see:
- A QR code
- A URL like `exp://192.168.1.100:8081`
- Options to connect

### Step 2: Connect Your Phone

**Option A: Scan QR Code (WiFi)**
1. Make sure your phone and computer are on the same WiFi network
2. In the app, tap "Scan QR Code"
3. Scan the QR code from your terminal

**Option B: USB Connection**
1. Connect phone via USB with USB debugging enabled
2. Run this command in a new terminal:
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```
3. In the app, tap the input field and enter: `http://localhost:8081`
4. Tap "Connect"

**Option C: Manual URL Entry**
1. In the app, tap the URL input field
2. Enter the URL shown in your terminal (e.g., `exp://192.168.1.100:8081`)
3. Tap "Connect"

### Step 3: App Will Load

Once connected:
- ✅ Metro will send the JavaScript bundle to your phone
- ✅ App will load and show your login screen
- ✅ App will automatically use the live backend (`https://mydoctoradmin.mydoctorplus.it/api`)

## That's It!

Your app is now running with:
- ✅ Live backend connection (already configured)
- ✅ All your code loaded from Metro
- ✅ Video calling functionality ready

## Troubleshooting

**"Unable to load script" error:**
- Make sure Metro is running (`npx expo start --dev-client`)
- Check WiFi connection (phone and computer on same network)
- Try USB connection instead

**Can't see server in app:**
- Make sure Metro is running
- Try manually entering the URL
- Check firewall isn't blocking port 8081

## Alternative: Production Build (No Metro Needed)

If you want an app that works without Metro:

```bash
eas build --profile production --platform android
```

This bundles everything inside the app, but takes longer to build.
