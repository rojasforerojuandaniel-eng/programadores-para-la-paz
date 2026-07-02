# Mobile environment variables

This file documents every environment variable used by the Rhynode Finance mobile app.

## Security rule

The real `.env` file is **never committed**. Only `.env.example` (this template) is in version control. Make sure your local `.env` is ignored by `.gitignore` (`apps/mobile/.gitignore`).

## Required variables

| Variable | What it does | Where to get it | Where to configure |
|---|---|---|---|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Authenticates the mobile app with Clerk | Clerk Dashboard → Application → API keys | `apps/mobile/.env` locally; EAS dashboard or `eas.json` for builds |
| `EXPO_PUBLIC_API_URL` | Base URL of the Rhynode Finance backend | Production deployment of the web app, e.g. `https://rhynode-finance.vercel.app` | `apps/mobile/.env` locally; EAS dashboard or `eas.json` for builds |

## Optional variables

| Variable | What it does | Where to get it | Where to configure |
|---|---|---|---|
| `EXPO_PUBLIC_SENTRY_DSN` | Sends crash/performance reports to Sentry | Sentry → Project → Settings → Client Keys (DSN) | EAS dashboard / `eas.json` |
| `EXPO_PUBLIC_POSTHOG_KEY` | Product analytics key | PostHog → Project settings | EAS dashboard / `eas.json` |
| `EXPO_PUBLIC_POSTHOG_HOST` | PostHog ingestion host | `https://us.i.posthog.com` (default) or `https://eu.i.posthog.com` | EAS dashboard / `eas.json` |

## Web Push / VAPID (production backend)

Push notifications for the mobile app use Expo push tokens, but the backend also supports web push subscriptions via the `web-push` library. The following VAPID keys are required for web push to work and must be configured in **Vercel production** (and in `apps/mobile/.env` only if you run the backend locally):

| Variable | What it does | Where to get it | Where to configure |
|---|---|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public VAPID key shared with browsers/clients | Generate a VAPID key pair (e.g. `npx web-push generate-vapid-keys`) | Vercel production environment variables |
| `VAPID_PRIVATE_KEY` | Private VAPID key used by `src/lib/notifications.ts` to sign web push requests | Same generated pair, keep secret | Vercel production environment variables (encrypted) |

The backend reads these keys at runtime in `src/lib/notifications.ts` and calls `webpush.setVapidDetails(...)`. If they are missing, web push notifications will fail silently on the server.

## Build-time behavior

`EXPO_PUBLIC_*` variables are baked into the JavaScript bundle at build time. Changing them requires a new native build (APK/AAB) via EAS, not just an OTA update.

## How to set variables for EAS builds

1. In the EAS dashboard, open the project and go to **Build credentials → Environment variables**, then add the variables scoped to the right build profile.
2. Alternatively, set them inline in `apps/mobile/eas.json` under the profile `env` object. Prefer the dashboard for secrets so they are not stored in Git.

## Local development

Copy the template and fill in your values:

```bash
cd apps/mobile
cp .env.example .env
# edit .env with your keys
```

## Production release signing

Android release builds also require these **keystore** environment variables, which are never committed and must be supplied to EAS or the local Gradle build:

- `RHYNODE_RELEASE_STORE_FILE`
- `RHYNODE_RELEASE_STORE_PASSWORD`
- `RHYNODE_RELEASE_KEY_ALIAS`
- `RHYNODE_RELEASE_KEY_PASSWORD`

See `scripts/generate-android-keystore.sh` to create the keystore.

## EAS build and submit commands

Production Android AAB:

```bash
cd apps/mobile
eas build --profile production --platform android
```

Production iOS release:

```bash
cd apps/mobile
eas build --profile production --platform ios
```

Submit the built AAB to Google Play (configure `submit.production.android.track` in `eas.json` first):

```bash
cd apps/mobile
eas submit --profile production --platform android
```

## Local release build

You can build a release APK locally for testing, but it will fail at the packaging step unless the release keystore variables are set:

```bash
cd apps/mobile/android
./gradlew assembleRelease
```

If you see `SigningConfig "release" is missing required property "storeFile"`, set the `RHYNODE_RELEASE_*` variables listed above or run the build via EAS where they are configured.
