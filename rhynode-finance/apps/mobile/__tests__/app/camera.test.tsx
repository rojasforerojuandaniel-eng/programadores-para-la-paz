import React from 'react';
import renderer from 'react-test-renderer';

jest.mock('expo/virtual/env.js', () => ({
  env: process.env,
}));

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock('~/lib/query-client', () => ({
  queryClient: {
    invalidateQueries: jest.fn(),
    clear: jest.fn(),
  },
  createAsyncStoragePersister: jest.fn(),
}));

jest.mock('expo-camera', () => {
  const React = jest.requireActual('react');
  const CameraView = React.forwardRef((props: Record<string, unknown>, ref: unknown) =>
    React.createElement('CameraView', { ref, ...props })
  );
  CameraView.displayName = 'CameraView';
  return {
    CameraView,
    useCameraPermissions: jest.fn(),
  };
});

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

jest.mock('@clerk/clerk-expo', () => ({
  useAuth: jest.fn(() => ({
    getToken: jest.fn().mockResolvedValue('valid-token'),
  })),
}));

jest.mock('~/lib/image-compress', () => ({
  compressImage: jest.fn().mockResolvedValue('file:///compressed.jpg'),
}));

jest.mock('~/hooks/use-toast', () => ({
  showToast: jest.fn(),
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
    ActivityIndicator: mockComponent('ActivityIndicator'),
    AppState: {
      currentState: 'active',
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
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

jest.mock('lucide-react-native', () => {
  const React = jest.requireActual('react');
  return {
    X: () => React.createElement('X'),
  };
});

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }),
  addEventListener: jest.fn(() => jest.fn()),
}));

import { useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import CameraScreen from '../../app/camera';

function findByTestID(instance: renderer.ReactTestInstance, testID: string) {
  return instance.find((node) => node.props.testID === testID);
}

describe('CameraScreen', () => {
  const mockBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      replace: jest.fn(),
      push: jest.fn(),
      back: mockBack,
    });
  });

  it('shows a permission request when camera access is not granted', () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([
      { granted: false },
      jest.fn(),
    ]);

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<CameraScreen />);
    });

    if (!tree) throw new Error('Renderer tree was not created');

    expect(findByTestID(tree.root, 'request-camera-permission')).toBeTruthy();
  });

  it('navigates back when the close button is pressed', () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([
      { granted: true },
      jest.fn(),
    ]);

    let tree: renderer.ReactTestRenderer | undefined;
    renderer.act(() => {
      tree = renderer.create(<CameraScreen />);
    });

    if (!tree) throw new Error('Renderer tree was not created');

    const closeButton = findByTestID(tree.root, 'camera-close');
    renderer.act(() => {
      closeButton.props.onPress();
    });

    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
