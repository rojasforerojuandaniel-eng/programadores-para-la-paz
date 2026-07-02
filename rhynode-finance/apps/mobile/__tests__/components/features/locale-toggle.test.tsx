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
    StyleSheet: {
      create: (styles: Record<string, unknown>) => styles,
      flatten: (...styles: Array<Record<string, unknown> | undefined>) => Object.assign({}, ...styles),
    },
  };
});

jest.mock('nativewind', () => ({
  cssInterop: (Component: React.ComponentType) => Component,
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'es' },
  }),
}));

jest.mock('~/lib/i18n', () => ({
  __esModule: true,
  default: {
    language: 'es',
    changeLanguage: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '~/lib/i18n';
import { LocaleToggle } from '~/components/features/locale-toggle';

describe('LocaleToggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists selected locale to AsyncStorage and changes language', () => {
    let tree: renderer.ReactTestRenderer | undefined;

    renderer.act(() => {
      tree = renderer.create(<LocaleToggle />);
    });

    if (!tree) throw new Error('LocaleToggle render tree is undefined');

    const pressables = tree.root.findAllByType('Pressable');
    expect(pressables).toHaveLength(2);

    const englishButton = pressables[1];

    renderer.act(() => {
      englishButton.props.onPress();
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@rhynode/locale', 'en');
    expect(i18n.changeLanguage).toHaveBeenCalledWith('en');
  });
});
