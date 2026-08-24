import '../setup';
import React from 'react';
import renderer from 'react-test-renderer';

const mockSetTheme = jest.fn();
jest.mock('~/lib/theme', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({
    theme: 'dark',
    resolvedTheme: 'dark',
    setTheme: mockSetTheme,
  }),
}));

jest.mock('~/lib/haptics', () => ({
  hapticImpact: jest.fn().mockResolvedValue(undefined),
  hapticNotification: jest.fn().mockResolvedValue(undefined),
}));

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: mockBack,
  }),
}));

const mockSignOut = jest.fn();
jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({
    isLoaded: true,
    isSignedIn: true,
    signOut: mockSignOut,
  }),
}));

import SettingsScreen from '~/app/settings';

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the settings title', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<SettingsScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Ajustes');
  });

  it('renders theme options', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<SettingsScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Sistema');
    expect(json).toContain('Claro');
    expect(json).toContain('Oscuro');
  });

  it('renders the sign out button', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<SettingsScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Cerrar sesión');
  });

  it('renders appearance section', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<SettingsScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Apariencia');
  });

  it('renders currency section', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<SettingsScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('Moneda');
    expect(json).toContain('COP');
  });

  it('renders back button', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<SettingsScreen />);
    });

    if (!tree) throw new Error('Tree not created');
    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain('← Volver');
  });

  it('has interactive Pressables', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<SettingsScreen />);
    });

    if (!tree) throw new Error('Tree not created');

    const pressables = tree.root.findAllByType('Pressable');
    // Should have: back, 3 theme options, currency selector, sign out = 6
    expect(pressables.length).toBeGreaterThanOrEqual(5);
  });

  it('theme Pressables trigger setTheme', () => {
    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<SettingsScreen />);
    });

    if (!tree) throw new Error('Tree not created');

    const pressables = tree.root.findAllByType('Pressable');
    // Press the second Pressable (Sistema theme - index 1, after back button)
    renderer.act(() => {
      pressables[1].props.onPress();
    });

    expect(mockSetTheme).toHaveBeenCalled();
  });
});
