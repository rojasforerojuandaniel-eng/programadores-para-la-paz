jest.mock('~/lib/biometric', () => ({
  isBiometricAvailable: jest.fn(),
  authenticateBiometric: jest.fn(),
}));

import React from 'react';
import renderer from 'react-test-renderer';
import { isBiometricAvailable, authenticateBiometric } from '~/lib/biometric';
import { useBiometric } from '~/hooks/use-biometric';

const mockedIsBiometricAvailable = isBiometricAvailable as jest.Mock;
const mockedAuthenticateBiometric = authenticateBiometric as jest.Mock;

function renderHook<T>(useHook: () => T) {
  const result = { current: undefined as unknown as T };

  function Wrapper() {
    result.current = useHook();
    return null;
  }

  renderer.act(() => {
    renderer.create(<Wrapper />);
  });

  return {
    get current() {
      return result.current as T;
    },
  };
}

async function waitFor(condition: () => boolean, timeout = 1000): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('waitFor timeout');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
    await renderer.act(async () => {
      await Promise.resolve();
    });
  }
}

describe('useBiometric', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns available false while loading', () => {
    mockedIsBiometricAvailable.mockImplementation(() => new Promise(() => {}));

    const hook = renderHook(() => useBiometric());

    expect(hook.current.available).toBe(false);
  });

  it('returns available true when biometry is available', async () => {
    mockedIsBiometricAvailable.mockResolvedValue(true);

    const hook = renderHook(() => useBiometric());

    await waitFor(() => hook.current.available === true);

    expect(mockedIsBiometricAvailable).toHaveBeenCalled();
  });

  it('returns available false when biometry is unavailable', async () => {
    mockedIsBiometricAvailable.mockResolvedValue(false);

    const hook = renderHook(() => useBiometric());

    await waitFor(() => hook.current.available === false);

    expect(mockedIsBiometricAvailable).toHaveBeenCalled();
  });

  it('exposes authenticateBiometric', () => {
    mockedIsBiometricAvailable.mockResolvedValue(false);

    const hook = renderHook(() => useBiometric());

    expect(hook.current.authenticate).toBe(mockedAuthenticateBiometric);
  });
});
