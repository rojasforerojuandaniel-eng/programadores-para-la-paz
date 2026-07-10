# Push Notifications Setup (FCM / Expo)

This guide prepares the Rhynode Finance Android app for production push notifications.

> VAPID keys are only for **web push** in the browser. For the Expo Android app we use **Firebase Cloud Messaging (FCM)** credentials configured in EAS.

---

## 1. Create a Firebase project

1. Open [https://console.firebase.google.com](https://console.firebase.google.com) and sign in with a Google account owned by the project.
2. Click **Create a project**.
3. Enter a project name, e.g. `rhynode-finance`.
4. Accept the terms and continue. You can skip Google Analytics unless the team already uses it.
5. When the project is ready, click the Android icon (**Add app**) or go to **Project settings > Your apps > Add app > Android**.

---

## 2. Register the Android app

In the Firebase "Add Firebase to your Android app" form:

- **Android package name**: `com.rhynode.finance`
- **App nickname** (optional): `Rhynode Finance Android`
- **Debug signing certificate SHA-1** (optional but recommended):
  - For local debug builds, run inside the repo:
    ```bash
    cd apps/mobile/android
    ./gradlew signingReport
    ```
  - Copy the SHA-1 under `AndroidDebugKey` and paste it into Firebase.
  - For release/production, also add the release keystore SHA-1.

Click **Register app**.

---

## 3. Download and place `google-services.json`

1. Firebase will prompt you to download `google-services.json`.
2. Save it to:

   ```
   apps/mobile/android/app/google-services.json
   ```

3. This file is already gitignored (see `apps/mobile/.gitignore`). Never commit it.
4. The Android `build.gradle` files should already apply the `google-services` plugin and read this file at build time.

---

## 4. Configure FCM credentials in EAS

Expo's push service (EAS) needs FCM credentials to send notifications to Android devices. Use FCM v1 (the modern, recommended API), not the legacy server key.

### 4.1 Create a Firebase service account

1. In Firebase console, go to **Project settings > Service accounts**.
2. Click **Generate new private key**.
3. Download the JSON key file. Keep it safe; it grants admin access to Firebase.

### 4.2 Upload the service account to EAS

Run inside `apps/mobile`:

```bash
cd apps/mobile
eas credentials
```

Then:

- Select **Android** > **Push Notifications: FCM V1** > **Upload a service account key**.
- Choose the JSON file downloaded in step 4.1.

EAS stores the key securely and uses it for all production push notifications.

> If you are not using EAS but running a bare/custom build, the backend could call FCM directly. In that case store the service account JSON as a server-side secret and do not include it in the mobile bundle.

---

## 5. How push works end-to-end

1. The mobile app requests an Expo push token via `Notifications.getExpoPushTokenAsync()`.
2. The app sends that token to the backend (see `POST /api/mobile/push-token`).
3. The backend stores the token linked to the authenticated user.
4. When a notification is needed, the backend calls the Expo Push Service with the token.
5. Expo forwards the notification to FCM, which delivers it to the Android device.

So the backend only talks to Expo; FCM credentials live in EAS, not in backend environment variables.

---

## 6. Verify everything

### Local build

```bash
cd apps/mobile
npx expo run:android
```

Confirm the app starts without Firebase initialization errors.

### EAS production build

```bash
cd apps/mobile
eas build --platform android --profile production
```

After install, trigger a test push from the backend or from the Expo push tool at [https://expo.dev/notifications](https://expo.dev/notifications).

---

## 7. Git ignore rules

`google-services.json` is already ignored in `apps/mobile/.gitignore`:

```gitignore
# Firebase Android configuration (contains API keys; never commit)
google-services.json
```

Also keep these general rules:

- Never commit `.env` or `.env.local`.
- Never commit keystores (`.keystore`, `.jks`).
- Never commit the Firebase service account JSON used by EAS.

---

## 8. Required public environment variables

See `apps/mobile/.env.example`. The production EAS build profile reads these variables at build time:

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_PUBLIC_POSTHOG_KEY`
- `EXPO_PUBLIC_POSTHOG_HOST`

Set them in the EAS build secrets / environment variables section of the Expo dashboard, or pass them via your CI pipeline.
