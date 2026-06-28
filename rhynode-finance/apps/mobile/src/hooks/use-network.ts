import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';

interface NetworkState {
  isOnline: boolean;
  wasOffline: boolean;
  setOnline: (online: boolean) => void;
  resetWasOffline: () => void;
}

export const useNetworkStore = create<NetworkState>((set) => ({
  isOnline: true,
  wasOffline: false,
  setOnline: (online) =>
    set((state) => ({
      isOnline: online,
      wasOffline: state.wasOffline || !online,
    })),
  resetWasOffline: () => set({ wasOffline: false }),
}));

export function useNetworkListener(): void {
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online =
        state.isConnected === true && state.isInternetReachable !== false;
      useNetworkStore.getState().setOnline(online);
    });
    return unsubscribe;
  }, []);
}
