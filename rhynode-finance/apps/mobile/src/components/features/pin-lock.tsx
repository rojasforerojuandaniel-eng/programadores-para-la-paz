import { useEffect, useState } from 'react';
import { Pressable, View, type PressableProps } from 'react-native';
import { cssInterop } from 'nativewind';
import { useTranslation } from 'react-i18next';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { authenticateBiometric } from '~/lib/biometric';
import { cn } from '~/lib/utils';
import { hapticImpact, hapticNotification } from '~/lib/haptics';
import { Text } from '~/components/ui/text';

const PIN_LENGTH = 6;
const PIN_HASH_KEY = 'rhynode_pin_hash';
const PIN_SALT_KEY = 'rhynode_pin_salt';

type PinLockMode = 'create' | 'confirm' | 'verify';

interface PinLockProps {
  onUnlock: () => void;
  allowDeviceFallback?: boolean;
}

type StyledPressableProps = PressableProps & { className?: string };
const StyledPressable = cssInterop(Pressable, { className: 'style' }) as React.ComponentType<StyledPressableProps>;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${salt}:${pin}`
  );
}

async function hasStoredPin(): Promise<boolean> {
  const [hash, salt] = await Promise.all([
    SecureStore.getItemAsync(PIN_HASH_KEY),
    SecureStore.getItemAsync(PIN_SALT_KEY),
  ]);
  return Boolean(hash && salt);
}

async function verifyPin(pin: string): Promise<boolean> {
  const [storedHash, salt] = await Promise.all([
    SecureStore.getItemAsync(PIN_HASH_KEY),
    SecureStore.getItemAsync(PIN_SALT_KEY),
  ]);
  if (!storedHash || !salt) return false;
  const computedHash = await hashPin(pin, salt);
  return constantTimeEqual(computedHash, storedHash);
}

async function storePin(pin: string): Promise<void> {
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const salt = bytesToHex(saltBytes);
  const hash = await hashPin(pin, salt);
  await Promise.all([
    SecureStore.setItemAsync(PIN_HASH_KEY, hash),
    SecureStore.setItemAsync(PIN_SALT_KEY, salt),
  ]);
}

function KeyButton({
  children,
  onPress,
  className,
  accessibilityLabel,
  disabled,
}: {
  children: React.ReactNode;
  onPress?: PressableProps['onPress'];
  className?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const handlePress = (event: Parameters<NonNullable<PressableProps['onPress']>>[0]) => {
    if (!disabled) {
      void hapticImpact();
    }
    onPress?.(event);
  };

  return (
    <StyledPressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: Boolean(disabled) }}
      className={cn(
        'h-16 w-16 items-center justify-center rounded-full bg-secondary active:opacity-80',
        className
      )}
    >
      {children}
    </StyledPressable>
  );
}

export function PinLock({ onUnlock, allowDeviceFallback = true }: PinLockProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<PinLockMode>('verify');
  const [pin, setPin] = useState('');
  const [draftPin, setDraftPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    void hasStoredPin().then((hasPin) => {
      setMode(hasPin ? 'verify' : 'create');
    });
  }, []);

  const handleDigit = (digit: string) => {
    if (isBusy || pin.length >= PIN_LENGTH) return;
    setError(null);
    setPin((prev) => prev + digit);
  };

  const handleDelete = () => {
    if (isBusy) return;
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const resetCreate = () => {
    setDraftPin('');
    setPin('');
    setMode('create');
  };

  const handleSubmit = async () => {
    if (pin.length !== PIN_LENGTH || isBusy) return;
    setIsBusy(true);
    setError(null);

    try {
      if (mode === 'verify') {
        const valid = await verifyPin(pin);
        if (valid) {
          void hapticNotification();
          onUnlock();
          return;
        }
        setError(t('auth.pin.error.invalid'));
        setPin('');
      } else if (mode === 'create') {
        setDraftPin(pin);
        setPin('');
        setMode('confirm');
      } else {
        if (pin === draftPin) {
          await storePin(pin);
          void hapticNotification();
          onUnlock();
          return;
        }
        setError(t('auth.pin.error.mismatch'));
        resetCreate();
      }
    } catch {
      setError(t('auth.pin.error.verifyFailed'));
      setPin('');
    } finally {
      setIsBusy(false);
    }
  };

  const handleDeviceFallback = async () => {
    setIsBusy(true);
    setError(null);
    const ok = await authenticateBiometric({
      promptMessage: t('auth.biometric.promptMessage'),
      fallbackLabel: t('auth.biometric.deviceFallbackLabel'),
      disableDeviceCredentials: false,
    });
    if (ok) {
      void hapticNotification();
      onUnlock();
    } else {
      setError(t('auth.biometric.error.deviceUnlockFailed'));
    }
    setIsBusy(false);
  };

  const title =
    mode === 'verify'
      ? t('auth.pin.title.verify')
      : mode === 'create'
        ? t('auth.pin.title.create')
        : t('auth.pin.title.confirm');

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <View className="flex-1 items-center justify-center bg-background px-6">
      <View className="w-full max-w-sm gap-8">
        <View className="items-center gap-2">
          <Text className="text-center text-2xl font-bold text-foreground">{title}</Text>
          {mode === 'verify' && (
            <Text className="text-center text-muted-foreground">
              {t('auth.pin.verifyHint')}
            </Text>
          )}
        </View>

        <View
          className="flex-row justify-center gap-3"
          accessibilityLabel={t('a11y.pin.progress', { current: pin.length, length: PIN_LENGTH })}
        >
          {Array.from({ length: PIN_LENGTH }).map((_, index) => {
            const filled = index < pin.length;
            return (
              <View
                key={index}
                className={cn(
                  'h-4 w-4 rounded-full border-2 border-primary',
                  filled && 'bg-primary'
                )}
              />
            );
          })}
        </View>

        {error && (
          <Text className="text-center text-destructive" accessibilityRole="alert">
            {error}
          </Text>
        )}

        <View className="gap-4">
          <View className="flex-row flex-wrap justify-center gap-4">
            {digits.map((digit) => (
              <KeyButton
                key={digit}
                onPress={() => handleDigit(digit)}
                accessibilityLabel={t('a11y.pin.key', { digit })}
                disabled={isBusy}
              >
                <Text className="text-2xl font-semibold text-foreground">{digit}</Text>
              </KeyButton>
            ))}
          </View>

          <View className="flex-row items-center justify-center gap-4">
            <View className="h-16 w-16" />
            <KeyButton
              onPress={() => handleDigit('0')}
              accessibilityLabel={t('a11y.pin.key', { digit: '0' })}
              disabled={isBusy}
            >
              <Text className="text-2xl font-semibold text-foreground">0</Text>
            </KeyButton>
            <KeyButton
              onPress={handleDelete}
              accessibilityLabel={t('common.delete')}
              disabled={isBusy || pin.length === 0}
            >
              <Text className="text-lg font-semibold text-foreground">⌫</Text>
            </KeyButton>
          </View>
        </View>

        <StyledPressable
          onPress={handleSubmit}
          disabled={pin.length !== PIN_LENGTH || isBusy}
          accessibilityRole="button"
          accessibilityLabel={t('common.continue')}
          accessibilityState={{ disabled: pin.length !== PIN_LENGTH || isBusy }}
          className={cn(
            'min-h-[48px] items-center justify-center rounded-2xl bg-primary px-5 py-3 active:opacity-90',
            (pin.length !== PIN_LENGTH || isBusy) && 'opacity-50'
          )}
        >
          <Text className="text-lg font-semibold text-primary-foreground">{t('common.continue')}</Text>
        </StyledPressable>

        {allowDeviceFallback && (
          <StyledPressable
            onPress={handleDeviceFallback}
            disabled={isBusy}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.pin.deviceFallback')}
            className="min-h-[48px] items-center justify-center rounded-2xl bg-secondary px-5 py-3 active:opacity-90"
          >
            <Text className="text-base font-medium text-secondary-foreground">
              {t('auth.pin.deviceFallbackLabel')}
            </Text>
          </StyledPressable>
        )}
      </View>
    </View>
  );
}

export { hasStoredPin, storePin, verifyPin, PIN_LENGTH };
