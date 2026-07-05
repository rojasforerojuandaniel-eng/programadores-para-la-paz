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
    KeyboardAvoidingView: mockComponent('KeyboardAvoidingView'),
    ScrollView: mockComponent('ScrollView'),
    Platform: { OS: 'ios' },
    Appearance: {
      getColorScheme: jest.fn(() => 'dark'),
      addChangeListener: jest.fn(),
      removeChangeListener: jest.fn(),
    },
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (...styles: Array<Record<string, unknown> | undefined>) => Object.assign({}, ...styles),
    },
  };
});

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('~/components/ui/button', () => {
  const mockReact = jest.requireActual('react');
  return {
    Button: (props: Record<string, unknown>) => mockReact.createElement('Button', props),
  };
});

jest.mock('~/components/ui/pressable', () => {
  const mockReact = jest.requireActual('react');
  return {
    Pressable: (props: Record<string, unknown>) => mockReact.createElement('Pressable', props),
  };
});

jest.mock('~/components/ui/text', () => {
  const mockReact = jest.requireActual('react');
  return {
    Text: (props: Record<string, unknown>) => mockReact.createElement('Text', props),
  };
});

jest.mock('~/components/ui/view', () => {
  const mockReact = jest.requireActual('react');
  return {
    View: (props: Record<string, unknown>) => mockReact.createElement('View', props),
  };
});

jest.mock('~/components/ui/keyboard-avoiding-view', () => {
  const mockReact = jest.requireActual('react');
  return {
    KeyboardAvoidingView: (props: Record<string, unknown>) =>
      mockReact.createElement('KeyboardAvoidingView', props),
  };
});

jest.mock('~/components/ui/scroll-view', () => {
  const mockReact = jest.requireActual('react');
  return {
    ScrollView: (props: Record<string, unknown>) => mockReact.createElement('ScrollView', props),
  };
});

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock('lucide-react-native', () => ({
  Shield: () => null,
  AlertCircle: () => null,
  TrendingUp: () => null,
}));

jest.mock('@clerk/clerk-expo', () => ({
  useSignIn: jest.fn(),
}));

import { useSignIn } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MfaScreen from '../../app/(auth)/mfa';

function findByAccessibilityLabel(instance: renderer.ReactTestInstance, label: string) {
  return instance.find((node) => node.props.accessibilityLabel === label);
}

function findByText(instance: renderer.ReactTestInstance, text: string) {
  return instance.find((node) => node.type === 'Text' && node.props.children === text);
}

function findByTestID(instance: renderer.ReactTestInstance, testID: string) {
  return instance.find((node) => node.props.testID === testID);
}

describe('MfaScreen', () => {
  const mockReplace = jest.fn();
  const mockAttemptSecondFactor = jest.fn();
  const mockSetActive = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useRouter as jest.Mock).mockReturnValue({
      replace: mockReplace,
      push: jest.fn(),
      back: jest.fn(),
    });

    (useLocalSearchParams as jest.Mock).mockReturnValue({
      identifier: 'test@example.com',
      signInAttemptId: 'attempt_123',
    });

    (useSignIn as jest.Mock).mockReturnValue({
      isLoaded: true,
      setActive: mockSetActive,
      signIn: {
        id: 'attempt_123',
        attemptSecondFactor: mockAttemptSecondFactor,
      },
    });
  });

  it('renders the TOTP input with the correct accessibility label', () => {
    let tree: renderer.ReactTestRenderer | undefined;

    renderer.act(() => {
      tree = renderer.create(<MfaScreen />);
    });

    if (!tree) throw new Error('Renderer tree was not created');

    const input = findByAccessibilityLabel(tree.root, 'Código TOTP');
    expect(input).toBeTruthy();

    const title = findByText(tree.root, 'Verificación en dos pasos');
    expect(title).toBeTruthy();
  });

  it('completes sign-in with a valid TOTP code', async () => {
    mockAttemptSecondFactor.mockResolvedValue({
      status: 'complete',
      createdSessionId: 'sess_123',
    });

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<MfaScreen />);
    });

    if (!tree) throw new Error('Renderer tree was not created');

    const input = findByAccessibilityLabel(tree.root, 'Código TOTP');
    const button = findByTestID(tree.root, 'mfa-verify-button');

    renderer.act(() => {
      input.props.onChangeText('123456');
    });

    await renderer.act(async () => {
      button.props.onPress();
    });

    expect(mockAttemptSecondFactor).toHaveBeenCalledWith({
      strategy: 'totp',
      code: '123456',
    });
    expect(mockSetActive).toHaveBeenCalledWith({ session: 'sess_123' });
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });

  it('shows a generic error when the TOTP code is incorrect or expired', async () => {
    mockAttemptSecondFactor.mockResolvedValue({
      status: 'needs_second_factor',
      createdSessionId: null,
    });

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<MfaScreen />);
    });

    if (!tree) throw new Error('Renderer tree was not created');

    const input = findByAccessibilityLabel(tree.root, 'Código TOTP');
    const button = findByTestID(tree.root, 'mfa-verify-button');

    renderer.act(() => {
      input.props.onChangeText('000000');
    });

    await renderer.act(async () => {
      button.props.onPress();
    });

    const errorText = findByText(tree.root, 'Código incorrecto o expirado. Intenta de nuevo.');
    expect(errorText).toBeTruthy();
  });

  it('shows a network error when attemptSecondFactor throws a network error', async () => {
    mockAttemptSecondFactor.mockRejectedValue(
      new Error('Network request failed')
    );

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<MfaScreen />);
    });

    if (!tree) throw new Error('Renderer tree was not created');

    const input = findByAccessibilityLabel(tree.root, 'Código TOTP');
    const button = findByTestID(tree.root, 'mfa-verify-button');

    renderer.act(() => {
      input.props.onChangeText('000000');
    });

    await renderer.act(async () => {
      button.props.onPress();
    });

    const errorText = findByText(tree.root, 'No hay conexión. Revisa tu red e intenta de nuevo.');
    expect(errorText).toBeTruthy();
  });

  it('supports backup codes as fallback', async () => {
    mockAttemptSecondFactor.mockResolvedValue({
      status: 'complete',
      createdSessionId: 'sess_backup',
    });

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<MfaScreen />);
    });

    if (!tree) throw new Error('Renderer tree was not created');

    const toggle = findByTestID(tree.root, 'mfa-toggle-backup');

    renderer.act(() => {
      toggle.props.onPress();
    });

    const input = findByAccessibilityLabel(tree.root, 'Código TOTP');
    const button = findByTestID(tree.root, 'mfa-verify-button');

    renderer.act(() => {
      input.props.onChangeText('BACKUP-CODE-1');
    });

    await renderer.act(async () => {
      button.props.onPress();
    });

    expect(mockAttemptSecondFactor).toHaveBeenCalledWith({
      strategy: 'backup_code',
      code: 'BACKUP-CODE-1',
    });
    expect(mockSetActive).toHaveBeenCalledWith({ session: 'sess_backup' });
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)');
  });
});
