import '../setup';
import React from 'react';
import renderer from 'react-test-renderer';

jest.mock('~/lib/haptics', () => ({
  hapticImpact: jest.fn().mockResolvedValue(undefined),
  hapticNotification: jest.fn().mockResolvedValue(undefined),
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

import OnboardingScreen from '~/app/(auth)/onboarding';

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the welcome title', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<OnboardingScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Bienvenido');
  });

  it('renders three mode options', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<OnboardingScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Personal');
    expect(json).toContain('Empresa');
    expect(json).toContain('Ambas');
  });

  it('renders mode descriptions', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<OnboardingScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('finanzas personales');
    expect(json).toContain('Facturación');
    expect(json).toContain('empresariales');
  });

  it('renders the continue button', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<OnboardingScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Continuar');
  });

  it('has 4 Pressables (3 modes + 1 continue)', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<OnboardingScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const pressables = tree.root.findAllByType('Pressable');
    expect(pressables.length).toBe(4);
  });

  it('mode Pressables can be pressed without errors', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<OnboardingScreen />);
    });

    if (!tree) throw new Error('Tree not created');

    const pressables = tree.root.findAllByType('Pressable');

    // Press each mode option
    for (let i = 0; i < 3; i++) {
      renderer.act(() => {
        pressables[i].props.onPress();
      });
    }

    // Component should still be rendered after interactions
    expect(tree.toJSON()).toBeTruthy();
  });

  it('renders hint text about changing mode later', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<OnboardingScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('cambiar');
    expect(json).toContain('Ajustes');
  });
});
