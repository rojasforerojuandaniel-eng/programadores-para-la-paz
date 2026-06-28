import renderer from 'react-test-renderer';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

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
    Pressable: mockComponent('Pressable'),
    View: mockComponent('View'),
    Text: mockComponent('Text'),
    Animated: {
      Value: class {
        constructor(value: number) {
           
          (this as unknown as { _value: number })._value = value;
        }
      },
      View: mockComponent('Animated.View'),
      loop: () => ({ start: () => {}, stop: () => {} }),
      sequence: () => null,
      timing: () => ({ start: () => {}, stop: () => {} }),
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

import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';

describe('Button', () => {
  it('renders children and responds to press', () => {
    const onPress = jest.fn();

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(
        <Button onPress={onPress}>
          <Text>Tap me</Text>
        </Button>
      );
    });

    if (!tree) throw new Error('Renderer tree was not created');

    const instance = tree.root;
    const textNode = instance.findByType('Text');
    expect(textNode.props.children).toBe('Tap me');

    renderer.act(() => {
      const pressable = instance.findByType('Pressable');
      pressable.props.onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
