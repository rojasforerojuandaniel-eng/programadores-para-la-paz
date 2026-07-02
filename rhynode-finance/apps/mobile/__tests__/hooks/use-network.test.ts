jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(),
}));

import React from 'react';
import renderer from 'react-test-renderer';
import NetInfo from '@react-native-community/netinfo';
import { useNetworkListener, useNetworkStore } from '~/hooks/use-network';

function renderListener() {
  function Listener() {
    useNetworkListener();
    return null;
  }

  let tree: renderer.ReactTestRenderer;
  renderer.act(() => {
    tree = renderer.create(React.createElement(Listener));
  });
  return tree!;
}

describe('useNetwork', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useNetworkStore.setState({ isOnline: true, wasOffline: false });
  });

  describe('store', () => {
    it('defaults to online', () => {
      expect(useNetworkStore.getState().isOnline).toBe(true);
      expect(useNetworkStore.getState().wasOffline).toBe(false);
    });

    it('tracks wasOffline when going offline', () => {
      useNetworkStore.getState().setOnline(false);
      expect(useNetworkStore.getState().isOnline).toBe(false);
      expect(useNetworkStore.getState().wasOffline).toBe(true);
    });

    it('keeps wasOffline true after coming back online', () => {
      useNetworkStore.getState().setOnline(false);
      useNetworkStore.getState().setOnline(true);
      expect(useNetworkStore.getState().isOnline).toBe(true);
      expect(useNetworkStore.getState().wasOffline).toBe(true);
    });

    it('resets wasOffline flag', () => {
      useNetworkStore.getState().setOnline(false);
      useNetworkStore.getState().resetWasOffline();
      expect(useNetworkStore.getState().wasOffline).toBe(false);
    });
  });

  describe('listener', () => {
    it('subscribes to NetInfo and unsubscribes on cleanup', () => {
      const unsubscribe = jest.fn();
      (NetInfo.addEventListener as jest.Mock).mockReturnValue(unsubscribe);

      const tree = renderListener();
      expect(NetInfo.addEventListener).toHaveBeenCalledWith(expect.any(Function));

      renderer.act(() => {
        tree.unmount();
      });
      expect(unsubscribe).toHaveBeenCalled();
    });

    it('sets online true when connected and reachable', () => {
      let handler: ((state: { isConnected: boolean; isInternetReachable: boolean }) => void) | undefined;
      (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
        handler = callback;
        return jest.fn();
      });

      renderListener();
      renderer.act(() => {
        handler?.({ isConnected: true, isInternetReachable: true });
      });

      expect(useNetworkStore.getState().isOnline).toBe(true);
    });

    it('sets online false when disconnected', () => {
      let handler: ((state: { isConnected: boolean; isInternetReachable: boolean }) => void) | undefined;
      (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
        handler = callback;
        return jest.fn();
      });

      renderListener();
      renderer.act(() => {
        handler?.({ isConnected: false, isInternetReachable: true });
      });

      expect(useNetworkStore.getState().isOnline).toBe(false);
      expect(useNetworkStore.getState().wasOffline).toBe(true);
    });

    it('treats null isInternetReachable as online', () => {
      let handler: ((state: { isConnected: boolean; isInternetReachable: boolean | null }) => void) | undefined;
      (NetInfo.addEventListener as jest.Mock).mockImplementation((callback) => {
        handler = callback;
        return jest.fn();
      });

      renderListener();
      renderer.act(() => {
        handler?.({ isConnected: true, isInternetReachable: null });
      });

      expect(useNetworkStore.getState().isOnline).toBe(true);
    });
  });
});
