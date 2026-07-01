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
    TextInput: mockComponent('TextInput'),
    Pressable: mockComponent('Pressable'),
    ActivityIndicator: mockComponent('ActivityIndicator'),
    Platform: { OS: 'ios' },
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (...styles: Array<Record<string, unknown> | undefined>) => Object.assign({}, ...styles),
    },
  };
});

jest.mock('expo-router', () => ({
  SplashScreen: {
    preventAutoHideAsync: jest.fn(),
    hideAsync: jest.fn(),
  },
  useRouter: jest.fn(),
  useSegments: jest.fn(),
}));

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: jest.fn(),
}));

jest.mock('~/lib/biometric', () => ({
  isBiometricAvailable: jest.fn(),
  authenticateBiometric: jest.fn(),
}));

jest.mock('~/components/features/pin-lock', () => ({
  PinLock: ({ onUnlock }: { onUnlock: () => void }) => {
    const React = jest.requireActual('react');
    return React.createElement('PinLock', {
      testID: 'pin-lock',
      onPress: onUnlock,
      accessibilityLabel: 'PIN lock',
    });
  },
}));

jest.mock('~/components/ui/text', () => ({
  Text: ({ children, ...props }: { children: React.ReactNode }) => {
    const React = jest.requireActual('react');
    return React.createElement('Text', props, children);
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

import { useAuth } from '@clerk/clerk-expo';
import { SplashScreen, useRouter, useSegments } from 'expo-router';
import { authenticateBiometric, isBiometricAvailable } from '~/lib/biometric';
import { AuthGate } from '../../src/components/features/auth-gate';
import { Text } from '~/components/ui/text';

function findByTestID(instance: renderer.ReactTestInstance, testID: string) {
  return instance.find((node) => node.props.testID === testID);
}

function findByType(instance: renderer.ReactTestInstance, type: string) {
  return instance.find((node) => node.type === type);
}

function findByText(instance: renderer.ReactTestInstance, text: string) {
  return instance.find((node) => node.type === 'Text' && node.props.children === text);
}

describe('AuthGate', () => {
  const mockReplace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
      push: jest.fn(),
      back: jest.fn(),
    });

    (useSegments as jest.Mock).mockReturnValue(['(tabs)']);
  });

  it('renders a splash loader while Clerk auth is loading', () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: false,
      isSignedIn: false,
    });

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(
        <AuthGate>
          <Text>Protected content</Text>
        </AuthGate>
      );
    });

    if (!tree) throw new Error('Renderer tree was not created');

    expect(findByType(tree.root, 'ActivityIndicator')).toBeTruthy();
    expect(() => findByText(tree.root, 'Protected content')).toThrow();
  });

  it('redirects signed-out users to the sign-in screen', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
    });

    renderer.act(() => {
      renderer.create(
        <AuthGate>
          <Text>Protected content</Text>
        </AuthGate>
      );
    });

    await renderer.act(async () => {
      await Promise.resolve();
    });

    expect(mockReplace).toHaveBeenCalledWith('/(auth)/sign-in');
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
  });

  it('shows children after successful biometric authentication', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    });
    (isBiometricAvailable as jest.Mock).mockResolvedValue(true);
    (authenticateBiometric as jest.Mock).mockResolvedValue(true);

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(
        <AuthGate>
          <Text>Protected content</Text>
        </AuthGate>
      );
    });

    if (!tree) throw new Error('Renderer tree was not created');

    await renderer.act(async () => {
      await Promise.resolve();
    });

    expect(authenticateBiometric).toHaveBeenCalledWith(
      expect.objectContaining({
        promptMessage: 'Desbloquea Rhynode',
        disableDeviceCredentials: true,
      })
    );
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
    expect(findByText(tree.root, 'Protected content')).toBeTruthy();
  });

  it('shows the PIN lock fallback when biometric is cancelled', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    });
    (isBiometricAvailable as jest.Mock).mockResolvedValue(true);
    (authenticateBiometric as jest.Mock).mockResolvedValue(false);

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(
        <AuthGate>
          <Text>Protected content</Text>
        </AuthGate>
      );
    });

    if (!tree) throw new Error('Renderer tree was not created');

    await renderer.act(async () => {
      await Promise.resolve();
    });

    expect(authenticateBiometric).toHaveBeenCalled();
    expect(findByTestID(tree.root, 'pin-lock')).toBeTruthy();
    expect(() => findByText(tree.root, 'Protected content')).toThrow();

    const pinLock = findByTestID(tree.root, 'pin-lock');
    await renderer.act(async () => {
      pinLock.props.onPress();
    });

    expect(findByText(tree.root, 'Protected content')).toBeTruthy();
  });

  it('shows children immediately when no biometric hardware is enrolled', async () => {
    (useAuth as jest.Mock).mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
    });
    (isBiometricAvailable as jest.Mock).mockResolvedValue(false);

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(
        <AuthGate>
          <Text>Protected content</Text>
        </AuthGate>
      );
    });

    if (!tree) throw new Error('Renderer tree was not created');

    await renderer.act(async () => {
      await Promise.resolve();
    });

    expect(authenticateBiometric).not.toHaveBeenCalled();
    expect(SplashScreen.hideAsync).toHaveBeenCalled();
    expect(findByText(tree.root, 'Protected content')).toBeTruthy();
  });
});
