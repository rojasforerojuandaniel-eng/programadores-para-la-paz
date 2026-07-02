jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react');
  return {
    Inbox: (props: Record<string, unknown>) => React.createElement('Inbox', props),
  };
});

import React from 'react';
import renderer from 'react-test-renderer';
import { Inbox } from 'lucide-react-native';

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

import { EmptyState } from '~/components/ui/empty-state';

function findByType(instance: renderer.ReactTestInstance, type: string) {
  return instance.find((node) => node.type === type);
}

function findAllByType(instance: renderer.ReactTestInstance, type: string) {
  return instance.findAll((node) => node.type === type);
}

describe('EmptyState', () => {
  it('renders icon, title and subtitle', () => {
    let tree: renderer.ReactTestRenderer | undefined;

    renderer.act(() => {
      tree = renderer.create(
        <EmptyState
          icon={Inbox}
          title="No items"
          subtitle="Add your first item to get started"
        />
      );
    });

    if (!tree) throw new Error('Renderer tree was not created');

    expect(findByType(tree.root, 'Inbox')).toBeTruthy();

    const textNodes = findAllByType(tree.root, 'Text');
    const texts = textNodes.map((node) => node.props.children);
    expect(texts).toContain('No items');
    expect(texts).toContain('Add your first item to get started');
  });

  it('renders action button when action is provided', () => {
    const onPress = jest.fn();
    let tree: renderer.ReactTestRenderer | undefined;

    renderer.act(() => {
      tree = renderer.create(
        <EmptyState
          icon={Inbox}
          title="No items"
          action={{ label: 'Create item', onPress }}
        />
      );
    });

    if (!tree) throw new Error('Renderer tree was not created');

    const textNodes = findAllByType(tree.root, 'Text');
    const texts = textNodes.map((node) => node.props.children);
    expect(texts).toContain('Create item');

    const pressable = findByType(tree.root, 'Pressable');
    renderer.act(() => {
      pressable.props.onPress();
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when action is omitted', () => {
    let tree: renderer.ReactTestRenderer | undefined;

    renderer.act(() => {
      tree = renderer.create(
        <EmptyState
          icon={Inbox}
          title="No items"
          subtitle="Nothing to see here"
        />
      );
    });

    if (!tree) throw new Error('Renderer tree was not created');

    const textNodes = findAllByType(tree.root, 'Text');
    const texts = textNodes.map((node) => node.props.children);
    expect(texts).not.toContain('Create item');
  });
});
