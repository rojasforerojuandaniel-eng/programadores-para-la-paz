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
    AccessibilityInfo: {
      announceForAccessibility: jest.fn(),
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

jest.mock('~/components/ui/moti-view', () => {
  const React = jest.requireActual('react');
  const MotiView = React.forwardRef((props: Record<string, unknown>, ref: unknown) => React.createElement('MotiView', { ref, ...props })
  );
  MotiView.displayName = 'MotiView';
  return { __esModule: true, MotiView, AnimatePresence: ({ children }: { children: React.ReactNode }) => children };
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('~/hooks/use-reduced-motion', () => ({
  useReducedMotion: () => false,
}));

import { ToastProvider } from '~/components/ui/toast';
import { showToast, useToast } from '~/hooks/use-toast';

describe('ToastProvider', () => {
  afterEach(() => {
    useToast.setState({ toasts: [], queue: [] });
  });

  it('stacks visible toasts with increasing translateY offset and zIndex', () => {
    let tree: renderer.ReactTestRenderer | undefined;

    renderer.act(() => {
      tree = renderer.create(<ToastProvider />);
    });

    renderer.act(() => {
      showToast('One', 'info');
      showToast('Two', 'success');
    });

    if (!tree) throw new Error('ToastProvider render tree is undefined');

    const motiViews = tree.root.findAllByType('MotiView');
    expect(motiViews).toHaveLength(2);

    const first = motiViews[0].props;
    const second = motiViews[1].props;

    expect(first.style?.zIndex).toBe(50);
    expect(second.style?.zIndex).toBe(51);
    expect(first.animate?.translateY).toBe(0);
    expect(second.animate?.translateY).toBe(8);
  });
});
