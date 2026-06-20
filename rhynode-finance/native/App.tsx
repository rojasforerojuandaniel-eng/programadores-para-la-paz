import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Linking from "expo-linking";
import * as LocalAuthentication from "expo-local-authentication";

const APP_URL =
  (process.env.EXPO_PUBLIC_APP_URL as string | undefined) ||
  "https://rhynode-finance.vercel.app";

/**
 * Rhynode native capuchón — a thin Expo shell that wraps the PWA in a WebView
 * and bridges native capabilities (biometry, push, camera, deep links) back to
 * the web app via postMessage.
 *
 * The web app can request native features with:
 *   window.ReactNativeWebView?.postMessage(JSON.stringify({ type: "BIOMETRIC" }))
 * and receives responses via a `window.__rhynodeNative` callback.
 */
export default function App() {
  const webviewRef = useRef<WebView>(null);
  const [ready, setReady] = useState(false);

  // Gate access behind biometric auth on launch.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!compatible || !enrolled) {
        setReady(true);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Desbloquea Rhynode",
        fallbackLabel: "Usar PIN",
      });
      if (!cancelled) setReady(result.success);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Forward rhynode:// deep links into the WebView as navigation messages.
  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      const path = deepLinkToPath(url);
      if (path) {
        webviewRef.current?.injectJavaScript(
          `window.location.replace(${JSON.stringify(path)}); true;`,
        );
      }
    });
    return () => subscription.remove();
  }, []);

  // Keep the Android hardware back button inside the WebView history.
  useEffect(() => {
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      webviewRef.current?.goBack();
      return true;
    });
    return () => handler.remove();
  }, []);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    let msg: { type: string; id?: string };
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    switch (msg.type) {
      case "BIOMETRIC":
        handleBiometric(msg.id);
        break;
      case "OPEN_CAMERA":
        // Camera + OCR flow: scan a receipt and POST it to /api/ai/ocr.
        // Implemented in a follow-up; the web app owns the upload UI.
        reply(msg.id, { ok: false, error: "camera_not_implemented" });
        break;
      default:
        reply(msg.id, { ok: false, error: "unknown_type" });
    }
  }, []);

  const handleBiometric = async (id?: string) => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Confirma tu identidad",
      fallbackLabel: "Usar PIN",
    });
    reply(id, { ok: result.success, error: result.success ? undefined : result.error });
  };

  const reply = (id: string | undefined, payload: Record<string, unknown>) => {
    const js = `window.__rhynodeNative?.(${JSON.stringify(JSON.stringify({ id, ...payload }))}); true;`;
    webviewRef.current?.injectJavaScript(js);
  };

  if (!ready) {
    return (
      <View style={styles.splash}>
        <StatusBar barStyle="light-content" />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <StatusBar barStyle="light-content" />
      <WebView
        ref={webviewRef}
        source={{ uri: APP_URL }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        onNavigationStateChange={(navState) => {
          // Let the OS handle external links; keep internal nav in the WebView.
          if (navState.url.startsWith("http") && !navState.url.startsWith(APP_URL)) {
            Linking.openURL(navState.url);
            webviewRef.current?.stopLoading();
          }
        }}
      />
    </View>
  );
}

/** Maps a `rhynode://` (or universal) link to a web app path. */
function deepLinkToPath(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    const path = parsed.path ?? "";
    const query = parsed.query ? `?${new URLSearchParams(parsed.query).toString()}` : "";
    return path ? `${path}${query}` : "/dashboard";
  } catch {
    return null;
  }
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#0f172a" },
  splash: { flex: 1, backgroundColor: "#0f172a" },
});