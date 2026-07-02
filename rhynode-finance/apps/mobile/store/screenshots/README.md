# Store Screenshots — Placeholders

These PNG files are **temporary placeholders** for the Google Play Console (and App Store Connect if applicable). They were generated automatically with representative text and a dark Rhynode theme.

## Files

| File | Screen | Resolution |
|---|---|---|
| `01-sign-in.png` | Sign-in / welcome | 1080 x 1920 |
| `02-dashboard.png` | Dashboard / home | 1080 x 1920 |
| `03-add-transaction.png` | Add transaction | 1080 x 1920 |
| `04-advisor-chat.png` | AI advisor chat | 1080 x 1920 |
| `05-settings.png` | Settings | 1080 x 1920 |

## Required before final launch

1. **Replace placeholders with real device screenshots** taken from a production-like build on Android (and iOS if publishing to App Store Connect).
2. **Create separate language sets**:
   - `screenshots/es/` — Spanish (primary market: Colombia / LATAM)
   - `screenshots/en/` — English
3. **Capture on real devices** when possible; emulators are acceptable for the first upload but real-device frames convert better.
4. **Follow each store's guidelines**:
   - Google Play: minimum 2 screenshots per type, JPEG or PNG 24-bit, no alpha for feature graphic.
   - App Store Connect: required if targeting iOS; follow safe-area and device-size rules.
5. **Update `feature-graphic.png`** (1024 x 500) with a final designed asset that includes the value proposition and brand elements.

## Tooling used for placeholders

Python PIL with the Rhynode dark palette (`#0A0A0F` background, emerald accent). The generation script is not saved to the repo; replace these files rather than regenerate them.
