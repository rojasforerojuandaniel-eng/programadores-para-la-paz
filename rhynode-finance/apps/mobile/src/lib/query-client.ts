import { QueryClient, focusManager, onlineManager } from '@tanstack/react-query';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

onlineManager.setEventListener((setOnline) => {
  const unsubscribe = NetInfo.addEventListener((state) => {
    const online = state.isConnected === true && state.isInternetReachable !== false;
    setOnline(online);
  });
  return unsubscribe;
});

focusManager.setEventListener((setFocused) => {
  const subscription = AppState.addEventListener('change', (status) => {
    setFocused(status === 'active');
  });
  return () => subscription.remove();
});

export function createAsyncStoragePersister(): Persister {
  const key = 'rhynode-mobile-query-cache';
  return {
    persistClient: async (client: PersistedClient) => {
      await AsyncStorage.setItem(key, JSON.stringify(client));
    },
    restoreClient: async () => {
      const value = await AsyncStorage.getItem(key);
      if (!value) return undefined;
      return JSON.parse(value) as PersistedClient;
    },
    removeClient: async () => {
      await AsyncStorage.removeItem(key);
    },
  };
}
