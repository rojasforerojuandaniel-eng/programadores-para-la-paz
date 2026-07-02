# Google Play Data Safety Form — Rhynode Finance

This document is a provisional draft for completing the Play Console **Data safety** section. It must be reviewed and updated to match the final production build and privacy policy.

## App identity

- **App name:** Rhynode Finance
- **Package name:** `com.rhynode.finance`
- **Primary market:** Colombia / LATAM
- **Privacy policy:** https://rhynode-finance.vercel.app/privacy
- **Terms of service:** https://rhynode-finance.vercel.app/terms

## Data collected

| Data type | Collected? | Shared with third parties? | Processed ephemerally? | Required or optional | Purpose |
|---|---|---|---|---|---|
| Email address | Yes | No (see providers below) | No | Required | Account creation, authentication, password recovery, support and billing communication |
| Name | Yes | No | No | Required | Personalization of the account and communication |
| User-entered financial info (accounts, transactions, budgets, debts, goals, subscriptions, invoices, tax estimates) | Yes | No | No | Required | Core personal and business finance management features |
| Purchase history / subscription status | Yes | No | No | Required | Billing and entitlement management |
| Device or other IDs (push token, device identifiers) | Yes | No | No | Required | Push notifications, device-specific diagnostics |
| App interactions / usage data | Yes | No | No | Optional (collected by default, can be limited) | Product improvement and analytics |
| Crash logs | Yes | No | No | Optional | Stability monitoring and bug fixing |
| Diagnostics / performance data | Yes | No | No | Optional | Performance monitoring and optimization |
| Voice input | Yes | No | Yes | Optional | On-device speech-to-text for quick transaction entry; not stored or transmitted |
| Precise / coarse location | No | — | — | — | Not collected |
| Contacts | No | — | — | — | Not collected |
| Photos / videos | No | — | — | — | Not collected |
| SMS / call logs | No | — | — | — | Not collected |
| Health / fitness | No | — | — | — | Not collected |

## Data sharing with third-party service providers

Rhynode does **not sell** personal data. The following service providers process data on our behalf under contract and appropriate security safeguards:

| Provider | Purpose | Data involved |
|---|---|---|
| **Clerk** | Authentication and identity management | Email, name, user ID |
| **Vercel** | Application hosting and serverless compute | All app data in transit, usage logs |
| **Neon** | PostgreSQL database hosting | User profile, transactions, financial records |
| **Stripe** | Subscription payment processing | Email, subscription status, payment method (handled by Stripe) |
| **Sentry** | Crash reporting and performance monitoring | Crash logs, performance data, device ID |
| **PostHog** | Product analytics | App interactions, usage data, device ID |
| **Anthropic / Ollama** | AI advisor, OCR, financial summaries | Only open-ended queries; common queries resolved locally |

## Security practices

- TLS encryption in transit.
- AES-256-GCM encryption at rest for sensitive customer data.
- Role-based access control and audit logging.
- Rate limiting on API endpoints.
- Authentication handled by Clerk with optional biometric login on supported devices.

## Data deletion

Users can request account deletion by contacting [soporte@rhynode.finance](mailto:soporte@rhynode.finance). Upon deletion, personal data is removed except where retention is required by Colombian law, in which case it is kept blocked.

## Notes

- This is a **provisional draft** aligned with the current feature set. Update it before launch to reflect the final build, actual SDKs integrated, and legal review.
- Voice entry is processed **on-device**; no audio is stored on our servers.
- Third-party SDKs must be declared accurately in the Play Console **SDK console** section.
