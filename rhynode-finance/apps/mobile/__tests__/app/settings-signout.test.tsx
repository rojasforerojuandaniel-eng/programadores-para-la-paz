import React from 'react';
import renderer from 'react-test-renderer';

jest.mock('react-native', () => {
  const React = jest.requireActual('react');
  const mockComponent = (name: string) => {
    const Comp = React.forwardRef((props: Record<string, unknown>, ref: unknown) =>
      React.createElement(name, { ref, ...props })
    );
    Comp.displayName = name;
    return Comp;
  };

  return {
    __esModule: true,
    View: mockComponent('View'),
    Text: mockComponent('Text'),
    Pressable: mockComponent('Pressable'),
    ScrollView: mockComponent('ScrollView'),
    Switch: mockComponent('Switch'),
    ActivityIndicator: mockComponent('ActivityIndicator'),
    Alert: { alert: jest.fn() },
    Linking: { openURL: jest.fn(() => Promise.resolve()) },
    Platform: { OS: 'ios' },
    Appearance: {
      getColorScheme: jest.fn(() => 'dark'),
      addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
      removeChangeListener: jest.fn(),
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812, scale: 2, fontScale: 1 })),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    AppState: {
      currentState: 'active',
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
    },
    AccessibilityInfo: {
      isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    },
    PixelRatio: {
      get: jest.fn(() => 2),
      getFontScale: jest.fn(() => 1),
      getPixelSizeForLayoutSize: jest.fn((size: number) => size),
      roundToNearestPixel: jest.fn((size: number) => size),
    },
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (...styles: Array<Record<string, unknown> | undefined>) => Object.assign({}, ...styles),
    },
  };
});

jest.mock('nativewind', () => ({
  cssInterop: (Component: React.ComponentType) => Component,
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackStyle: { Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('~/lib/theme', () => ({
  useTheme: jest.fn(() => ({ theme: 'dark', resolvedTheme: 'dark', setTheme: jest.fn() })),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: jest.fn(),
  useUser: jest.fn(),
}));

const mockAsyncStorage = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (key: string) => mockAsyncStorage.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    mockAsyncStorage.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    mockAsyncStorage.delete(key);
  }),
}));

const mockSecureStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockSecureStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureStore.delete(key);
  }),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'test-push-token' })),
  AndroidImportance: { DEFAULT: 'default' },
}));

const queryClientClear = jest.fn();
jest.mock('~/lib/query-client', () => ({
  queryClient: {
    clear: jest.fn(),
  },
}));

const resetOfflineQueue = jest.fn(async () => {});
jest.mock('~/lib/offline-queue', () => ({
  resetOfflineQueue: jest.fn(async () => {}),
}));

jest.mock('~/lib/api', () => ({
  API_URL: 'https://rhynode-finance.vercel.app',
  createApiClient: () => ({
    post: jest.fn(() => Promise.resolve({ ok: true })),
  }),
}));

jest.mock('~/hooks/use-toast', () => ({
  showToast: jest.fn(),
}));

import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { queryClient } from '~/lib/query-client';
import { resetOfflineQueue as mockResetOfflineQueue } from '~/lib/offline-queue';
import { PUSH_ENABLED_KEY } from '~/lib/notifications';
import { BIOMETRIC_ENABLED_KEY } from '~/lib/biometric';
import SettingsScreen from '../../app/settings';

function findByText(instance: renderer.ReactTestInstance, text: string) {
  return instance.find((node) => node.type === 'Text' && node.props.children === text);
}

function findByAccessibilityLabel(instance: renderer.ReactTestInstance, label: string) {
  return instance.find((node) => node.props.accessibilityLabel === label);
}

async function waitForEffects() {
  await renderer.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('SettingsScreen sign-out cleanup', () => {
  const mockReplace = jest.fn();
  const mockBack = jest.fn();
  const mockSignOut = jest.fn();
  const mockGetToken = jest.fn(() => Promise.resolve('jwt-token'));

  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.clear();
    mockSecureStore.clear();
    global.fetch = jest.fn();

    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
      push: jest.fn(),
      back: mockBack,
    });

    (useAuth as jest.Mock).mockReturnValue({
      signOut: mockSignOut,
      getToken: mockGetToken,
    });

    (useUser as jest.Mock).mockReturnValue({
      user: {
        primaryEmailAddress: { emailAddress: 'user@example.com' },
      },
      isLoaded: true,
    });

    (queryClient.clear as jest.Mock).mockImplementation(queryClientClear);
    (mockResetOfflineQueue as jest.Mock).mockImplementation(resetOfflineQueue);
  });

  it('calls DELETE push-token and clears local state before redirecting on sign-out', async () => {
    mockSignOut.mockResolvedValue(undefined);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    mockAsyncStorage.set(PUSH_ENABLED_KEY, 'true');
    mockSecureStore.set(BIOMETRIC_ENABLED_KEY, 'true');

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<SettingsScreen />);
    });
    await waitForEffects();

    const signOutButton = findByAccessibilityLabel(tree!.root, 'Cerrar sesión');
    renderer.act(() => {
      signOutButton.props.onPress();
    });

    expect(Alert.alert).toHaveBeenCalled();
    const [, , buttons] = (Alert.alert as jest.Mock).mock.calls[0] as [
      string,
      string,
      Array<{ text: string; style?: string; onPress?: () => void }>,
    ];
    const destructiveButton = buttons.find((b) => b.style === 'destructive');
    expect(destructiveButton).toBeDefined();

    await renderer.act(async () => {
      await destructiveButton!.onPress?.();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://rhynode-finance.vercel.app/api/mobile/push-token',
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(mockSignOut).toHaveBeenCalled();
    expect(queryClientClear).toHaveBeenCalled();
    expect(mockAsyncStorage.has(PUSH_ENABLED_KEY)).toBe(false);
    expect(mockSecureStore.has(BIOMETRIC_ENABLED_KEY)).toBe(false);
    expect(resetOfflineQueue).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/sign-in');
  });

  it('does not redirect when signOut fails and shows an error', async () => {
    mockSignOut.mockRejectedValue(new Error('sign-out failed'));

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<SettingsScreen />);
    });
    await waitForEffects();

    const signOutButton = findByAccessibilityLabel(tree!.root, 'Cerrar sesión');
    renderer.act(() => {
      signOutButton.props.onPress();
    });

    const [, , buttons] = (Alert.alert as jest.Mock).mock.calls[0] as [
      string,
      string,
      Array<{ text: string; style?: string; onPress?: () => void }>,
    ];
    const destructiveButton = buttons.find((b) => b.style === 'destructive');

    await renderer.act(async () => {
      await destructiveButton!.onPress?.();
    });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(() =>
      findByText(tree!.root, 'No se pudo cerrar sesión. Inténtalo de nuevo.')
    ).not.toThrow();
  });

  it('continues cleanup even if DELETE push-token fails', async () => {
    mockSignOut.mockResolvedValue(undefined);
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network down'));

    mockAsyncStorage.set(PUSH_ENABLED_KEY, 'true');

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<SettingsScreen />);
    });
    await waitForEffects();

    const signOutButton = findByAccessibilityLabel(tree!.root, 'Cerrar sesión');
    renderer.act(() => {
      signOutButton.props.onPress();
    });

    const [, , buttons] = (Alert.alert as jest.Mock).mock.calls[0] as [
      string,
      string,
      Array<{ text: string; style?: string; onPress?: () => void }>,
    ];
    const destructiveButton = buttons.find((b) => b.style === 'destructive');

    await renderer.act(async () => {
      await destructiveButton!.onPress?.();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/sign-in');
    expect(mockAsyncStorage.has(PUSH_ENABLED_KEY)).toBe(false);
  });
});
