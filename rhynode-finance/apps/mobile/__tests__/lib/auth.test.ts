jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

import * as SecureStore from 'expo-secure-store';
import { tokenCache } from '~/lib/auth';

describe('tokenCache', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gets a token from SecureStore', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue('stored-token');

    const token = await tokenCache.getToken('clerk-key');

    expect(token).toBe('stored-token');
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('clerk-key');
  });

  it('saves a token to SecureStore', async () => {
    await tokenCache.saveToken('clerk-key', 'new-token');

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('clerk-key', 'new-token');
  });
});
