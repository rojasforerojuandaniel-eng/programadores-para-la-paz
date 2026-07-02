import React from 'react';
import renderer from 'react-test-renderer';

const mockSecureStore = new Map<string, string>();

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
    TextInput: mockComponent('TextInput'),
    ActivityIndicator: mockComponent('ActivityIndicator'),
    Platform: { OS: 'ios' },
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (...styles: Array<Record<string, unknown> | undefined>) => Object.assign({}, ...styles),
    },
  };
});

jest.mock('nativewind', () => ({
  cssInterop: (Component: React.ComponentType) => Component,
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn(async (_algorithm: string, input: string) => `sha256-${input}`),
  getRandomBytesAsync: jest.fn(async (byteCount: number) => new Uint8Array(byteCount).fill(0xab)),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockSecureStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureStore.delete(key);
  }),
}));

jest.mock('@clerk/clerk-expo', () => ({
  useUser: jest.fn(),
}));

jest.mock('~/lib/biometric', () => ({
  authenticateBiometric: jest.fn(),
  BIOMETRIC_ENABLED_KEY: '@rhynode/biometric-enabled',
  isBiometricAvailable: jest.fn(),
}));

jest.mock('~/lib/haptics', () => ({
  hapticImpact: jest.fn(),
  hapticNotification: jest.fn(),
}));

jest.mock('~/components/ui/text', () => ({
  Text: ({ children, ...props }: { children: React.ReactNode }) => {
    const React = jest.requireActual('react');
    return React.createElement('Text', props, children);
  },
}));

jest.mock('~/theme/colors', () => ({
  colors: { primary: '#10b981' },
}));

import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { useUser } from '@clerk/clerk-expo';
import { authenticateBiometric } from '~/lib/biometric';
import {
  PinLock,
  PIN_LENGTH,
  setPinHashIterationsForTests,
  storePin,
  verifyPin,
} from '~/components/features/pin-lock';

const mounted: renderer.ReactTestRenderer[] = [];

function renderPinLock(props: React.ComponentProps<typeof PinLock>) {
  let tree: renderer.ReactTestRenderer | undefined;
  renderer.act(() => {
    tree = renderer.create(<PinLock {...props} />);
  });
  if (!tree) throw new Error('Failed to render PinLock');
  mounted.push(tree);
  return tree;
}

function findByAccessibilityLabel(instance: renderer.ReactTestInstance, label: string) {
  return instance.find((node) => node.props.accessibilityLabel === label);
}

function pressByLabel(instance: renderer.ReactTestInstance, label: string) {
  const node = findByAccessibilityLabel(instance, label);
  renderer.act(() => {
    node.props.onPress();
  });
}

async function waitForEffects() {
  await renderer.act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function pressDigits(instance: renderer.ReactTestInstance, digits: string) {
  for (const digit of digits) {
    pressByLabel(instance, `Tecla ${digit}`);
  }
}

describe('PinLock', () => {
  const mockOnUnlock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureStore.clear();
    setPinHashIterationsForTests(3);
    (useUser as jest.Mock).mockReturnValue({
      user: { id: 'user-123' },
      isLoaded: true,
    });
  });

  afterEach(() => {
    mounted.forEach((tree) => {
      renderer.act(() => {
        tree.unmount();
      });
    });
    mounted.length = 0;
  });

  it('renders a loading state until the user and PIN state are loaded', () => {
    (useUser as jest.Mock).mockReturnValue({ user: null, isLoaded: false });

    const tree = renderPinLock({ onUnlock: mockOnUnlock });

    expect(tree.root.find((node) => node.type === 'ActivityIndicator')).toBeTruthy();
  });

  it('creates a PIN, stores it with user-specific keys, and unlocks after confirmation', async () => {
    const tree = renderPinLock({ onUnlock: mockOnUnlock });
    await waitForEffects();

    expect(() => findByAccessibilityLabel(tree.root, 'Crea un PIN de seguridad')).not.toThrow();

    pressDigits(tree.root, '123456');
    await waitForEffects();

    expect(() => findByAccessibilityLabel(tree.root, 'Confirma tu PIN')).not.toThrow();

    pressDigits(tree.root, '123456');
    await waitForEffects();

    expect(mockOnUnlock).toHaveBeenCalled();
    expect(mockSecureStore.has('rhynode_pin_hash:user-123')).toBe(true);
    expect(mockSecureStore.has('rhynode_pin_salt:user-123')).toBe(true);
    expect(mockSecureStore.has('rhynode_pin_iterations:user-123')).toBe(true);
  });

  it('verifies a stored PIN for the same user and calls onUnlock', async () => {
    await storePin('654321', 'user-123', 3);

    const tree = renderPinLock({ onUnlock: mockOnUnlock });
    await waitForEffects();

    pressDigits(tree.root, '654321');
    await waitForEffects();

    expect(mockOnUnlock).toHaveBeenCalled();
  });

  it('auto-submits when the 6th digit is entered', async () => {
    await storePin('111111', 'user-123', 3);

    const tree = renderPinLock({ onUnlock: mockOnUnlock });
    await waitForEffects();

    for (let i = 0; i < PIN_LENGTH; i++) {
      pressByLabel(tree.root, 'Tecla 1');
    }
    await waitForEffects();

    expect(mockOnUnlock).toHaveBeenCalled();
  });

  it('locks out after 5 failed attempts and disables the keypad', async () => {
    await storePin('000000', 'user-123', 3);

    const tree = renderPinLock({ onUnlock: mockOnUnlock, lockoutDurationMs: 60000 });
    await waitForEffects();

    for (let i = 0; i < 5; i++) {
      pressDigits(tree.root, '999999');
      await waitForEffects();
    }

    const alert = tree.root.find(
      (node) => node.type === 'Text' && node.props.accessibilityRole === 'alert'
    );
    expect(alert).toBeDefined();
    expect(alert.props.children).toContain('Demasiados intentos');

    const keyNode = tree.root.find(
      (node) => node.type === 'Pressable' && node.props.accessibilityLabel === 'Tecla 1'
    );
    expect(keyNode).toBeDefined();
    expect(keyNode.props.disabled).toBe(true);

    expect(mockSecureStore.get('rhynode_pin_attempts:user-123')).toBe('5');
    expect(Number(mockSecureStore.get('rhynode_pin_lockout_until:user-123'))).toBeGreaterThan(
      Date.now()
    );
  });

  it('does not unlock for the same PIN under a different user', async () => {
    await storePin('123456', 'user-123', 3);

    (useUser as jest.Mock).mockReturnValue({
      user: { id: 'user-456' },
      isLoaded: true,
    });

    const tree = renderPinLock({ onUnlock: mockOnUnlock });
    await waitForEffects();

    pressDigits(tree.root, '123456');
    await waitForEffects();

    expect(mockOnUnlock).not.toHaveBeenCalled();
  });

  it('uses SHA-256, salt and the user id when hashing the PIN', async () => {
    await storePin('555555', 'user-123', 3);

    const calls = (Crypto.digestStringAsync as jest.Mock).mock.calls as [string, string][];
    const firstCall = calls[0];
    expect(firstCall[0]).toBe('SHA-256');
    expect(firstCall[1]).toContain('user-123');
    expect(firstCall[1]).toContain('555555');
  });

  it('clears stored attempts after a successful verification', async () => {
    await storePin('777777', 'user-123', 3);
    await SecureStore.setItemAsync('rhynode_pin_attempts:user-123', '2');

    const tree = renderPinLock({ onUnlock: mockOnUnlock });
    await waitForEffects();

    pressDigits(tree.root, '777777');
    await waitForEffects();

    expect(mockOnUnlock).toHaveBeenCalled();
    expect(mockSecureStore.has('rhynode_pin_attempts:user-123')).toBe(false);
  });

  it('falls back to biometric unlock when available', async () => {
    (authenticateBiometric as jest.Mock).mockResolvedValue(true);

    const tree = renderPinLock({ onUnlock: mockOnUnlock });
    await waitForEffects();

    const fallbackButton = findByAccessibilityLabel(tree.root, 'Usar desbloqueo del dispositivo');
    renderer.act(() => {
      fallbackButton.props.onPress();
    });
    await waitForEffects();

    expect(authenticateBiometric).toHaveBeenCalled();
    expect(mockOnUnlock).toHaveBeenCalled();
  });
});

describe('verifyPin', () => {
  beforeEach(() => {
    mockSecureStore.clear();
  });

  it('returns false when no PIN is stored for the user', async () => {
    await expect(verifyPin('123456', 'user-123')).resolves.toBe(false);
  });

  it('returns false when stored iterations are missing', async () => {
    await SecureStore.setItemAsync('rhynode_pin_hash:user-123', 'hash');
    await SecureStore.setItemAsync('rhynode_pin_salt:user-123', 'salt');

    await expect(verifyPin('123456', 'user-123')).resolves.toBe(false);
  });
});
