import { useEffect, useState } from 'react';
import { isBiometricAvailable, authenticateBiometric } from '~/lib/biometric';

export function useBiometric() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setAvailable);
  }, []);

  return { available, authenticate: authenticateBiometric };
}
