# 🛡️ YouTube Ad-Free Player for Android

A high-performance, native Android application engineered to **block YouTube ads directly** at the transport and player engine levels.

---

## 🎯 How It Directly Blocks Ads

Unlike DNS or VPN blockers (which cannot block YouTube video ads because they are served over pinned TLS from the exact same media servers as normal videos), this app blocks ads using a **4-tier direct interception system**:

1. **Network Transport Interception (`WebClient.kt` & `AdBlockEngine.kt`)**:
   - Intercepts requests to DoubleClick, Google Ad Services, and YouTube's `/pagead/`, `/ptracking`, and `/api/stats/ads` endpoints in `shouldInterceptRequest`.
   - Returns an immediate `HTTP 204 (No Content)` without touching the network.

2. **Player Payload Sanitization (`adblock.js`)**:
   - Hooks `ytInitialPlayerResponse`, `window.fetch`, and `XMLHttpRequest`.
   - Strips `adPlacements`, `playerAds`, and `adSlots` from player configuration payloads **before** the YouTube player engine ever initializes. The player never receives the ad stream.

3. **Fallback Fast-Forwarder**:
   - If an unskippable ad ever slips through server-side injection, the background interval mutes audio, ramps playback speed to `16x`, and seeks `currentTime = duration`.
   - Clicks `.ytp-ad-skip-button` within milliseconds.

4. **DOM & CSS Suppression (`adblock.css`)**:
   - Hides sponsored video items, home feed banner ads, search recommendations, and anti-adblocker popups.

---

## ✨ Features

- **No Ads**: Pre-roll, mid-roll, post-roll video ads and banner promotions are stripped.
- **Background Playback**: Video/audio continues playing when the screen is locked or the app is minimized (via `PlaybackService` and Visibility API override).
- **Picture-in-Picture (PiP)**: Dedicated PiP button or automatic PiP on home gesture.
- **Native Fullscreen**: Seamless landscape rotation when expanding videos.
- **Deep-Link Integration**: Open YouTube links directly in this app from browsers or messages.
- **Zero Account Ban Risk**: Operates using standard web protocols; your Google account remains safe if you choose to sign in.

---

## 🚀 How to Build & Install on Your Phone

### Option A: Using Android Studio (Recommended)

1. Open **Android Studio**.
2. Click **Open** and select the folder:
   ```
   G:\Ustream\youtube-adblock-android
   ```
3. Let Gradle sync project dependencies.
4. Connect your Android phone via USB (with **USB Debugging** enabled in Developer Options) or start an emulator.
5. Click the green **Run (▶)** button.
6. The app will compile, install directly to your device, and launch!

### Option B: Building APK via Terminal / Gradle

Run in the project directory:

```bash
# On Linux / macOS:
./gradlew assembleDebug

# On Windows PowerShell:
gradle assembleDebug
```

The generated APK will be located at:
```
app/build/outputs/apk/debug/app-debug.apk
```
Copy this `.apk` to your phone and tap to install.

---

## 📂 Project Structure

```
youtube-adblock-android/
├── app/
│   ├── build.gradle.kts
│   ├── proguard-rules.pro
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── assets/
│       │   ├── adblock.js      # Player response purifier & skip scriptlet
│       │   └── adblock.css     # Ad element suppression stylesheet
│       ├── java/com/adblock/youtube/
│       │   ├── MainActivity.kt    # Main activity, PiP, fullscreen handler
│       │   ├── WebClient.kt       # WebView client & request interceptor
│       │   ├── AdBlockEngine.kt   # Host matching & payload injection
│       │   └── PlaybackService.kt # Background audio playback service
│       └── res/
│           ├── layout/activity_main.xml
│           ├── values/
│           └── drawable/
├── build.gradle.kts
├── settings.gradle.kts
└── gradle.properties
```
