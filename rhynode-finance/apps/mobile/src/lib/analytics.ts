import PostHog from 'posthog-react-native';
import * as SecureStore from 'expo-secure-store';
import { CONSENT_ANALYTICS_KEY } from './consent';

export const ANALYTICS_ENABLED_KEY = CONSENT_ANALYTICS_KEY;

let posthog: PostHog | null = null;
let analyticsEnabledCache: boolean | null = null;
let analyticsCacheExplicitlySet = false;

SecureStore.getItemAsync(ANALYTICS_ENABLED_KEY)
  .then((value) => {
    if (!analyticsCacheExplicitlySet) {
      analyticsEnabledCache = value === 'true';
    }
  })
  .catch(() => {
    if (!analyticsCacheExplicitlySet) {
      analyticsEnabledCache = false;
    }
  });

function getPostHogKey(): string | undefined {
  return process.env.EXPO_PUBLIC_POSTHOG_KEY;
}

function getPostHogHost(): string {
  return process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';
}

async function initAnalyticsAsync(): Promise<PostHog | null> {
  if (posthog) return posthog;

  const key = getPostHogKey();
  if (!key) return null;

  if (!isAnalyticsEnabled()) return null;

  posthog = new PostHog(key, { host: getPostHogHost() });
  return posthog;
}

export async function track(
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const client = await initAnalyticsAsync();
  if (!client) return;

  client.capture(event, properties as Parameters<PostHog['capture']>[1]);
}

export function resetAnalytics(): void {
  posthog = null;
}

export function setAnalyticsEnabled(enabled: boolean): void {
  analyticsCacheExplicitlySet = true;
  analyticsEnabledCache = enabled;
  void SecureStore.setItemAsync(ANALYTICS_ENABLED_KEY, enabled ? 'true' : 'false');
  if (!enabled && posthog && typeof posthog.optOut === 'function') {
    void posthog.optOut();
    posthog = null;
  }
}

export function isAnalyticsEnabled(): boolean {
  return analyticsEnabledCache ?? false;
}
