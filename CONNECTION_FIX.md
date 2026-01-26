# Fix: "Failed to connect to localhost" Error

## The Problem

The error "Failed to connect to localhost/127.0.0.1:8082" happens because:
- On your **phone**, `localhost` means the phone itself
- But Metro is running on your **computer**
- The phone can't find Metro at `localhost`

## Solution: Use Your Computer's IP Address

### Step 1: Make Sure Metro is Running

```bash
cd E:\Doctor_Overall\mydoctor-app
npx expo start --dev-client
```

You should see:
- A QR code
- A URL like `exp://192.168.1.100:8081` or `http://192.168.1.100:8081`
- Your computer's IP address

### Step 2: Find Your Computer's IP Address

**On Windows:**
```bash
ipconfig
```

Look for "IPv4 Address" under your WiFi adapter. It will be something like `192.168.1.100` or `192.168.0.105`.

### Step 3: Connect Using IP Address

**Option A: Scan QR Code (Easiest)**
1. Make sure phone and computer are on **same WiFi network**
2. In the app, tap "Scan QR Code"
3. Scan the QR code from your terminal
4. It should connect automatically

**Option B: Manual URL Entry**
1. In the app, tap the URL input field
2. Clear `localhost:8081`
3. Enter your computer's IP address: `exp://192.168.1.100:8081` (replace with your actual IP)
4. Tap "Connect"

**Option C: USB Connection (If WiFi Doesn't Work)**
1. Connect phone via USB
2. Enable USB debugging
3. Run this command:
   ```bash
   adb reverse tcp:8081 tcp:8081
   ```
4. In the app, enter: `http://localhost:8081`
5. Tap "Connect"

## Troubleshooting

### "Failed to connect" Still Appears

1. **Check WiFi Connection:**
   - Phone and computer must be on same WiFi
   - Try disconnecting and reconnecting WiFi on phone

2. **Check Firewall:**
   - Windows Firewall might be blocking port 8081
   - Allow Node.js through firewall, or temporarily disable firewall

3. **Check Metro is Running:**
   - Make sure terminal shows Metro is running
   - Look for "Metro waiting on exp://..." message

4. **Try USB Instead:**
   ```bash
   # Connect phone via USB
   adb reverse tcp:8081 tcp:8081
   # Then in app, use: http://localhost:8081
   ```

5. **Check IP Address:**
   - Make sure you're using the correct IP from `ipconfig`
   - It should start with `192.168.x.x` or `10.0.x.x`

### Still Not Working?

Try this step-by-step:

1. **Stop Metro** (Ctrl+C in terminal)

2. **Start Metro with tunnel:**
   ```bash
   npx expo start --dev-client --tunnel
   ```
   This uses Expo's tunnel service (slower but more reliable)

3. **Scan the new QR code** that appears

4. **Or use USB:**
   ```bash
   adb reverse tcp:8081 tcp:8081
   npx expo start --dev-client
   ```
   Then in app, use: `http://localhost:8081`

## Quick Fix Commands

```bash
# Get your IP address
ipconfig

# Start Metro
cd E:\Doctor_Overall\mydoctor-app
npx expo start --dev-client

# If using USB, also run:
adb reverse tcp:8081 tcp:8081
```

Then in the app:
- Use the IP address from `ipconfig` (not localhost)
- Or scan the QR code from Metro terminal
- Or use `http://localhost:8081` if using USB with adb reverse
