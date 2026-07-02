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
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (...styles: Array<Record<string, unknown> | undefined>) =>
        Object.assign({}, ...styles),
    },
  };
});

jest.mock('nativewind', () => ({
  cssInterop: (Component: React.ComponentType) => Component,
}));

jest.mock('expo/virtual/env.js', () => ({
  env: {},
}));

jest.mock('~/lib/consent', () => ({
  CONSENT_ANALYTICS_KEY: '@rhynode/consent-analytics',
  getConsentAsync: jest.fn(),
  setConsentAsync: jest.fn(),
}));

jest.mock('~/lib/notifications', () => ({
  getPushConsentAsync: jest.fn(),
  setPushConsentAsync: jest.fn(),
  PUSH_ENABLED_KEY: '@rhynode/push-enabled',
  requestPushPermissionsAsync: jest.fn(),
  registerPushTokenAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('~/components/ui/button', () => ({
  Button: (props: Record<string, unknown>) =>
    jest.requireActual('react').createElement('Button', props),
}));

jest.mock('~/components/ui/card', () => ({
  Card: (props: Record<string, unknown>) =>
    jest.requireActual('react').createElement('Card', props),
}));

jest.mock('~/components/ui/text', () => ({
  Text: (props: Record<string, unknown>) =>
    jest.requireActual('react').createElement('Text', props),
}));

jest.mock('~/components/ui/view', () => ({
  View: (props: Record<string, unknown>) =>
    jest.requireActual('react').createElement('View', props),
}));

jest.mock('~/components/features/settings-items', () => ({
  SettingsRow: (props: Record<string, unknown>) =>
    jest.requireActual('react').createElement('SettingsRow', props),
  SettingsSwitch: (props: Record<string, unknown>) =>
    jest.requireActual('react').createElement('SettingsSwitch', {
      ...props,
      accessibilityRole: 'switch',
    }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { setConsentAsync, getConsentAsync } from '~/lib/consent';
import {
  setPushConsentAsync,
  getPushConsentAsync,
  requestPushPermissionsAsync,
  registerPushTokenAsync,
} from '~/lib/notifications';
import { setItem } from '@react-native-async-storage/async-storage';
import { ConsentBanner } from '~/components/features/consent-banner';

const setConsentAsyncMock = setConsentAsync as jest.Mock;
const getConsentAsyncMock = getConsentAsync as jest.Mock;
const setPushConsentAsyncMock = setPushConsentAsync as jest.Mock;
const getPushConsentAsyncMock = getPushConsentAsync as jest.Mock;
const requestPushPermissionsAsyncMock = requestPushPermissionsAsync as jest.Mock;
const registerPushTokenAsyncMock = registerPushTokenAsync as jest.Mock;
const asyncStorageSetItemMock = setItem as jest.Mock;

describe('ConsentBanner', () => {
  const mockOnComplete = jest.fn();
  const mockGetToken = jest.fn(() => Promise.resolve('token'));

  beforeEach(() => {
    jest.clearAllMocks();
    getConsentAsyncMock.mockResolvedValue(false);
    getPushConsentAsyncMock.mockResolvedValue('denied');
    requestPushPermissionsAsyncMock.mockResolvedValue(true);
  });

  it('renders a loading state while reading stored consent', () => {
    const tree = renderer.create(<ConsentBanner onComplete={mockOnComplete} />);
    expect(tree.toJSON()).toMatchSnapshot();
  });

  it('loads saved consent values and renders the toggles', async () => {
    getConsentAsyncMock.mockResolvedValue(true);
    getPushConsentAsyncMock.mockResolvedValue('granted');

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<ConsentBanner onComplete={mockOnComplete} />);
    });

    await renderer.act(async () => {
      await Promise.resolve();
    });

    expect(tree).toBeDefined();
    const instance = tree!.root;
    expect(() => instance.findByProps({ testID: 'analytics-consent-row' })).not.toThrow();
    expect(() => instance.findByProps({ testID: 'push-consent-row' })).not.toThrow();
  });

  it('saves both consent preferences and invokes onComplete', async () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<ConsentBanner onComplete={mockOnComplete} />);
    });

    await renderer.act(async () => {
      await Promise.resolve();
    });

    const button = tree!.root.findByProps({ testID: 'consent-continue-button' });

    await renderer.act(async () => {
      button.props.onPress();
      await Promise.resolve();
    });

    expect(setConsentAsyncMock).toHaveBeenCalledWith('@rhynode/consent-analytics', false);
    expect(setPushConsentAsyncMock).toHaveBeenCalledWith('denied');
    expect(asyncStorageSetItemMock).toHaveBeenCalledWith('@rhynode/push-enabled', 'false');
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('persists analytics as enabled when the toggle is switched on', async () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<ConsentBanner onComplete={mockOnComplete} />);
    });

    await renderer.act(async () => {
      await Promise.resolve();
    });

    const analyticsRow = tree!.root.findByProps({ testID: 'analytics-consent-row' });
    const analyticsSwitch = analyticsRow.findByProps({ accessibilityRole: 'switch' });

    renderer.act(() => {
      analyticsSwitch.props.onValueChange(true);
    });

    const button = tree!.root.findByProps({ testID: 'consent-continue-button' });
    await renderer.act(async () => {
      button.props.onPress();
      await Promise.resolve();
    });

    expect(setConsentAsyncMock).toHaveBeenCalledWith('@rhynode/consent-analytics', true);
  });

  it('registers the push token when push is enabled and a getToken callback is provided', async () => {
    getPushConsentAsyncMock.mockResolvedValue('granted');

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(
        <ConsentBanner onComplete={mockOnComplete} getToken={mockGetToken} />
      );
    });

    await renderer.act(async () => {
      await Promise.resolve();
    });

    const pushRow = tree!.root.findByProps({ testID: 'push-consent-row' });
    const pushSwitch = pushRow.findByProps({ accessibilityRole: 'switch' });

    renderer.act(() => {
      pushSwitch.props.onValueChange(true);
    });

    const button = tree!.root.findByProps({ testID: 'consent-continue-button' });
    await renderer.act(async () => {
      button.props.onPress();
      await Promise.resolve();
    });

    expect(requestPushPermissionsAsyncMock).toHaveBeenCalled();
    expect(registerPushTokenAsyncMock).toHaveBeenCalledWith(mockGetToken);
  });
});
