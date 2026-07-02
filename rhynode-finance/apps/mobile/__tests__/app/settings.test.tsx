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

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
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

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'opened' })),
}));

jest.mock('~/lib/api', () => ({
  API_URL: 'https://rhynode-finance.vercel.app',
  createApiClient: () => ({
    post: jest.fn(() => Promise.resolve({ ok: true })),
  }),
}));

jest.mock('~/lib/query-client', () => ({
  queryClient: { clear: jest.fn(), invalidateQueries: jest.fn() },
  createAsyncStoragePersister: jest.fn(),
}));

jest.mock('~/lib/offline-queue', () => ({
  resetOfflineQueue: jest.fn(),
}));

jest.mock('~/hooks/use-toast', () => ({
  showToast: jest.fn(),
}));

import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import SettingsScreen from '../../app/settings';

function findByText(instance: renderer.ReactTestInstance, text: string) {
  return instance.find((node) => node.type === 'Text' && node.props.children === text);
}

describe('SettingsScreen', () => {
  const mockReplace = jest.fn();
  const mockBack = jest.fn();
  const mockSignOut = jest.fn();
  const mockGetToken = jest.fn(() => Promise.resolve('jwt-token'));

  beforeEach(() => {
    jest.clearAllMocks();

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
  });

  it('renders all settings sections', async () => {
    let tree: renderer.ReactTestRenderer | undefined;

    renderer.act(() => {
      tree = renderer.create(<SettingsScreen />);
    });

    await renderer.act(async () => {
      await Promise.resolve();
    });

    expect(tree).toBeDefined();
    if (!tree) throw new Error('SettingsScreen render tree is undefined');
    const instance = tree.root;

    expect(() => findByText(instance, 'Ajustes')).not.toThrow();
    expect(() => findByText(instance, 'Cuenta')).not.toThrow();
    expect(() => findByText(instance, 'Correo electrónico')).not.toThrow();
    expect(() => findByText(instance, 'Tema')).not.toThrow();
    expect(() => findByText(instance, 'Idioma')).not.toThrow();
    expect(() => findByText(instance, 'Privacidad')).not.toThrow();
    expect(() => findByText(instance, 'Biometría / PIN')).not.toThrow();
    expect(() => findByText(instance, 'Legal')).not.toThrow();
    expect(() => findByText(instance, 'Cerrar sesión')).not.toThrow();
  });

  it('renders accessible toggle rows with testID', async () => {
    let tree: renderer.ReactTestRenderer | undefined;

    renderer.act(() => {
      tree = renderer.create(<SettingsScreen />);
    });

    await renderer.act(async () => {
      await Promise.resolve();
    });

    expect(tree).toBeDefined();
    if (!tree) throw new Error('SettingsScreen render tree is undefined');

    expect(() => tree.root.findByProps({ testID: 'analytics-toggle-row' })).not.toThrow();
    expect(() => tree.root.findByProps({ testID: 'push-consent-toggle-row' })).not.toThrow();
    expect(() => tree.root.findByProps({ testID: 'biometric-toggle-row' })).not.toThrow();
  });
});
