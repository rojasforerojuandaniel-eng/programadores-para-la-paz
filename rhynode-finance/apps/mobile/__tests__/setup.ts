/**
 * Shared test setup — mocks for React Native, Expo, Clerk, and NativeWind.
 * Import this at the top of each test file or add to jest.setup.js.
 */
import React from 'react';

/* ------------------------------------------------------------------ */
/*  React Native mock                                                 */
/* ------------------------------------------------------------------ */
jest.mock('react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const mockComponent = (name: string) => {
    const Comp = React.forwardRef((props: Record<string, unknown>, ref: unknown) =>
      React.createElement(name, { ref, ...props })
    );
    Comp.displayName = name;
    return Comp;
  };

  return {
    __esModule: true,
    Platform: { OS: 'ios', select: (obj: Record<string, unknown>) => obj.ios ?? obj.default },
    Pressable: mockComponent('Pressable'),
    View: mockComponent('View'),
    Text: mockComponent('Text'),
    TextInput: mockComponent('TextInput'),
    ScrollView: mockComponent('ScrollView'),
    FlatList: mockComponent('FlatList'),
    RefreshControl: mockComponent('RefreshControl'),
    KeyboardAvoidingView: mockComponent('KeyboardAvoidingView'),
    Linking: { openURL: jest.fn() },
    useColorScheme: () => 'dark',
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (...styles: Array<Record<string, unknown> | undefined>) => Object.assign({}, ...styles),
    },
    Animated: {
      Value: class {
        _value: number;
        constructor(value: number) { this._value = value; }
      },
      View: mockComponent('Animated.View'),
      loop: () => ({ start: () => {}, stop: () => {} }),
      sequence: () => null,
      timing: () => ({ start: () => {}, stop: () => {} }),
    },
  };
});

/* ------------------------------------------------------------------ */
/*  NativeWind mock                                                   */
/* ------------------------------------------------------------------ */
jest.mock('nativewind', () => ({
  cssInterop: (Component: React.ComponentType) => Component,
}));

/* ------------------------------------------------------------------ */
/*  Expo modules mock                                                 */
/* ------------------------------------------------------------------ */
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => ['(tabs)'],
  Stack: { Screen: jest.fn() },
  Tabs: { Screen: jest.fn() },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'es' }],
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'mock-push-token' }),
  setNotificationChannelAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  addNotificationResponseReceivedListener: jest.fn().mockReturnValue({ remove: jest.fn() }),
  AndroidImportance: { DEFAULT: 'default' },
}));

jest.mock('expo-camera', () => ({
  CameraView: jest.fn(),
  useCameraPermissions: () => [{ granted: false }, jest.fn()],
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn().mockResolvedValue(true),
  isEnrolledAsync: jest.fn().mockResolvedValue(true),
  authenticateAsync: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('react-native-svg', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const makeMock = (name: string) => {
    const C = React.forwardRef((props: Record<string, unknown>, ref: unknown) =>
      React.createElement(name, { ref, ...props })
    );
    C.displayName = name;
    return C;
  };
  return {
    __esModule: true,
    default: makeMock('Svg'),
    Svg: makeMock('Svg'),
    Path: makeMock('Path'),
    Circle: makeMock('Circle'),
  };
});

jest.mock('moti', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const MotiView = React.forwardRef((props: Record<string, unknown>, ref: unknown) =>
    React.createElement('MotiView', { ref, ...props })
  );
  MotiView.displayName = 'MotiView';
  return {
    __esModule: true,
    MotiView,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

/* ------------------------------------------------------------------ */
/*  Clerk mock                                                        */
/* ------------------------------------------------------------------ */
jest.mock('@clerk/clerk-expo', () => ({
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    getToken: jest.fn().mockResolvedValue('mock-jwt'),
    signOut: jest.fn(),
  }),
  useSignIn: () => ({
    signIn: { create: jest.fn() },
    isLoaded: true,
  }),
  useSSO: () => ({
    startSSOFlow: jest.fn().mockResolvedValue({ createdSessionId: 'mock-session', setActive: jest.fn() }),
  }),
}));

/* ------------------------------------------------------------------ */
/*  TanStack React Query mock                                          */
/* ------------------------------------------------------------------ */
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn().mockReturnValue({ data: null, isLoading: true, refetch: jest.fn() }),
  useMutation: jest.fn().mockReturnValue({ mutate: jest.fn(), isPending: false }),
  useQueryClient: () => ({
    invalidateQueries: jest.fn(),
  }),
  QueryClient: jest.fn(),
  focusManager: { setEventListener: jest.fn() },
  onlineManager: { setEventListener: jest.fn() },
}));

jest.mock('@tanstack/react-query-persist-client', () => ({
  PersistQueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

/* ------------------------------------------------------------------ */
/*  NetInfo mock                                                      */
/* ------------------------------------------------------------------ */
jest.mock('@react-native-community/netinfo', () => ({
  default: {
    fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
    addEventListener: jest.fn().mockReturnValue(jest.fn()),
  },
}));

/* ------------------------------------------------------------------ */
/*  Lucide React Native mock                                          */
/* ------------------------------------------------------------------ */
jest.mock('lucide-react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  const mockIcon = (name: string) => {
    const Icon = (props: Record<string, unknown>) => React.createElement(`Icon-${name}`, props);
    Icon.displayName = name;
    return Icon;
  };
  const icons = [
    'Home', 'List', 'PlusCircle', 'Target', 'Menu', 'User', 'Briefcase', 'Layers',
    'ChevronRight', 'ChevronLeft', 'Mail', 'Lock', 'Apple', 'AlertCircle', 'TrendingUp',
    'Moon', 'Sun', 'Monitor', 'LogOut', 'FileText', 'Users', 'FolderOpen', 'Brain',
    'Settings', 'Camera', 'CreditCard', 'PiggyBank', 'Scale', 'Repeat', 'Sparkles',
    'Calendar', 'Wallet', 'Receipt',
  ];
  const result: Record<string, unknown> = {};
  for (const name of icons) {
    result[name] = mockIcon(name);
  }
  return { __esModule: true, ...result };
});

/* ------------------------------------------------------------------ */
/*  i18n mock                                                         */
/* ------------------------------------------------------------------ */
jest.mock('~/lib/i18n', () => ({
  default: { t: (key: string) => key, language: 'es' },
}));

/* ------------------------------------------------------------------ */
/*  Offline queue mock                                                */
/* ------------------------------------------------------------------ */
jest.mock('~/lib/offline-queue', () => ({
  enqueueMutation: jest.fn().mockResolvedValue('mock-id'),
  dequeueMutation: jest.fn().mockResolvedValue(null),
  getPendingMutations: jest.fn().mockResolvedValue([]),
  incrementRetry: jest.fn(),
  clearMutation: jest.fn(),
}));
