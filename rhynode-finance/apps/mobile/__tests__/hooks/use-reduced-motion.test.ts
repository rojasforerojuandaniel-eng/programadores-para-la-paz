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

  let reduceMotionChangedHandler: ((enabled: boolean) => void) | null = null;

  return {
    __esModule: true,
    Text: mockComponent('Text'),
    View: mockComponent('View'),
    AccessibilityInfo: {
      isReduceMotionEnabled: jest.fn(),
      addEventListener: jest.fn((_event: string, handler: (enabled: boolean) => void) => {
        reduceMotionChangedHandler = handler;
        return { remove: () => { reduceMotionChangedHandler = null; } };
      }),
      __triggerReduceMotionChanged: (enabled: boolean) => {
        reduceMotionChangedHandler?.(enabled);
      },
    },
  };
});

import { Text } from 'react-native';
import { useReducedMotion } from '~/hooks/use-reduced-motion';

const { AccessibilityInfo } = jest.requireMock('react-native') as {
  AccessibilityInfo: {
    isReduceMotionEnabled: jest.Mock;
    addEventListener: jest.Mock;
    __triggerReduceMotionChanged: (enabled: boolean) => void;
  };
};

function TestComponent() {
  const reducedMotion = useReducedMotion();
  return React.createElement(Text, null, reducedMotion ? 'reduced' : 'normal');
}

describe('useReducedMotion', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reflects the initial reduced motion setting', async () => {
    AccessibilityInfo.isReduceMotionEnabled.mockResolvedValue(true);

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(React.createElement(TestComponent));
    });

    if (!tree) throw new Error('Renderer tree was not created');

    await renderer.act(async () => {
      await Promise.resolve();
    });

    const textNode = tree.root.findByType('Text');
    expect(textNode.props.children).toBe('reduced');
  });

  it('updates when the system setting changes', async () => {
    AccessibilityInfo.isReduceMotionEnabled.mockResolvedValue(false);

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(React.createElement(TestComponent));
    });

    if (!tree) throw new Error('Renderer tree was not created');

    await renderer.act(async () => {
      await Promise.resolve();
    });

    expect(tree.root.findByType('Text').props.children).toBe('normal');

    renderer.act(() => {
      AccessibilityInfo.__triggerReduceMotionChanged(true);
    });

    expect(tree.root.findByType('Text').props.children).toBe('reduced');
  });

  it('does not update state after unmounting', async () => {
    let resolvePromise: (value: boolean) => void = () => {};
    AccessibilityInfo.isReduceMotionEnabled.mockImplementation(
      () => new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(React.createElement(TestComponent));
    });

    if (!tree) throw new Error('Renderer tree was not created');

    renderer.act(() => {
      tree!.unmount();
    });

    await renderer.act(async () => {
      resolvePromise(true);
      await Promise.resolve();
    });

    // No error should be thrown and the stale component should not update.
    expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
  });
});
