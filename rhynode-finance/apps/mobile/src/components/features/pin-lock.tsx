import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, View, type PressableProps } from 'react-native';
import { cssInterop } from 'nativewind';
import { useTranslation } from 'react-i18next';
import { useUser } from '@clerk/clerk-expo';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { authenticateBiometric } from '~/lib/biometric';
import { cn } from '~/lib/utils';
import { hapticImpact, hapticNotification } from '~/lib/haptics';
import { colors } from '~/theme/colors';
import { Text } from '~/components/ui/text';

export const PIN_LENGTH = 6;
let PIN_ITERATIONS = 10_000;

export function setPinHashIterationsForTests(iterations: number): void {
  PIN_ITERATIONS = iterations;
}
const MAX_ATTEMPTS = 5;
const DEFAULT_LOCKOUT_MS = 5 * 60 * 1000;

const PIN_HASH_KEY = (userId: string) => `rhynode_pin_hash:${userId}`;
const PIN_SALT_KEY = (userId: string) => `rhynode_pin_salt:${userId}`;
const PIN_ITERATIONS_KEY = (userId: string) => `rhynode_pin_iterations:${userId}`;
const PIN_ATTEMPTS_KEY = (userId: string) => `rhynode_pin_attempts:${userId}`;
const PIN_LOCKOUT_UNTIL_KEY = (userId: string) => `rhynode_pin_lockout_until:${userId}`;

type PinLockMode = 'create' | 'confirm' | 'verify';

interface PinLockProps {
  onUnlock: () => void;
  allowDeviceFallback?: boolean;
  lockoutDurationMs?: number;
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

async function hashPin(
  pin: string,
  { salt, userId, iterations }: { salt: string; userId: string; iterations: number }
): Promise<string> {
  let digest = `${userId}:${salt}:${pin}`;
  for (let i = 0; i < iterations; i++) {
    digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      `${digest}:${salt}:${i}`
    );
  }
  return digest;
}

export async function hasStoredPin(userId: string): Promise<boolean> {
  const [hash, salt, iterations] = await Promise.all([
    SecureStore.getItemAsync(PIN_HASH_KEY(userId)),
    SecureStore.getItemAsync(PIN_SALT_KEY(userId)),
    SecureStore.getItemAsync(PIN_ITERATIONS_KEY(userId)),
  ]);
  return Boolean(hash && salt && iterations);
}

export async function verifyPin(pin: string, userId: string): Promise<boolean> {
  const [storedHash, salt, iterationsRaw] = await Promise.all([
    SecureStore.getItemAsync(PIN_HASH_KEY(userId)),
    SecureStore.getItemAsync(PIN_SALT_KEY(userId)),
    SecureStore.getItemAsync(PIN_ITERATIONS_KEY(userId)),
  ]);
  if (!storedHash || !salt || !iterationsRaw) return false;

  const iterations = Number(iterationsRaw);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  const computedHash = await hashPin(pin, { salt, userId, iterations });
  return constantTimeEqual(computedHash, storedHash);
}

export async function storePin(
  pin: string,
  userId: string,
  iterations: number = PIN_ITERATIONS
): Promise<void> {
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const salt = bytesToHex(saltBytes);
  const hash = await hashPin(pin, { salt, userId, iterations });
  await Promise.all([
    SecureStore.setItemAsync(PIN_HASH_KEY(userId), hash),
    SecureStore.setItemAsync(PIN_SALT_KEY(userId), salt),
    SecureStore.setItemAsync(PIN_ITERATIONS_KEY(userId), String(iterations)),
  ]);
}

async function getStoredAttempts(userId: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(PIN_ATTEMPTS_KEY(userId));
  if (!raw) return 0;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getLockoutUntil(userId: string): Promise<number | null> {
  const raw = await SecureStore.getItemAsync(PIN_LOCKOUT_UNTIL_KEY(userId));
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

async function resetPinLockout(userId: string): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(PIN_ATTEMPTS_KEY(userId)),
    SecureStore.deleteItemAsync(PIN_LOCKOUT_UNTIL_KEY(userId)),
  ]);
}

function KeyButton({
  children,
  onPress,
  className,
  accessibilityLabel,
  accessibilityHint,
  disabled,
}: {
  children: React.ReactNode;
  onPress?: PressableProps['onPress'];
  className?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  disabled?: boolean;
}) {
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
      accessibilityHint={accessibilityHint}
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

export function PinLock({ onUnlock, allowDeviceFallback = true, lockoutDurationMs = DEFAULT_LOCKOUT_MS }: PinLockProps) {
  const { t } = useTranslation();
  const { user, isLoaded: isUserLoaded } = useUser();
  const userId = user?.id;

  const [mode, setMode] = useState<PinLockMode>('verify');
  const [pin, setPin] = useState('');
  const [draftPin, setDraftPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!userId) return;
    void (async () => {
      const [hasPin, lockoutUntil, storedAttempts] = await Promise.all([
        hasStoredPin(userId),
        getLockoutUntil(userId),
        getStoredAttempts(userId),
      ]);
      setMode(hasPin ? 'verify' : 'create');
      setLockedUntil(lockoutUntil);
      setAttempts(storedAttempts);
      setIsReady(true);
    })();
  }, [userId]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const isLockedOut = lockedUntil !== null && now < lockedUntil;

  const handleSubmit = async () => {
    if (pin.length !== PIN_LENGTH || isBusy || !userId || isLockedOut) return;
    setIsBusy(true);
    setError(null);

    try {
      if (mode === 'verify') {
        const valid = await verifyPin(pin, userId);
        if (valid) {
          await resetPinLockout(userId);
          setPin('');
          void hapticNotification();
          onUnlock();
          return;
        }

        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        await SecureStore.setItemAsync(PIN_ATTEMPTS_KEY(userId), String(nextAttempts));

        if (nextAttempts >= MAX_ATTEMPTS) {
          const until = Date.now() + lockoutDurationMs;
          setLockedUntil(until);
          await SecureStore.setItemAsync(PIN_LOCKOUT_UNTIL_KEY(userId), String(until));
          setError(
            t('auth.pin.error.locked', { minutes: Math.ceil(lockoutDurationMs / 60000) })
          );
        } else {
          setError(t('auth.pin.error.invalid'));
        }
        setPin('');
      } else if (mode === 'create') {
        setDraftPin(pin);
        setPin('');
        setMode('confirm');
      } else {
        if (pin === draftPin) {
          await storePin(pin, userId);
          await resetPinLockout(userId);
          setPin('');
          setDraftPin('');
          void hapticNotification();
          onUnlock();
          return;
        }
        setError(t('auth.pin.error.mismatch'));
        setDraftPin('');
        setPin('');
        setMode('create');
      }
    } catch {
      setError(t('auth.pin.error.verifyFailed'));
      setPin('');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  });

  useEffect(() => {
    if (pin.length === PIN_LENGTH && !isBusy && !isLockedOut) {
      void handleSubmitRef.current();
    }
  }, [pin, isBusy, isLockedOut]);

  const handleDigit = (digit: string) => {
    if (isBusy || isLockedOut || pin.length >= PIN_LENGTH) return;
    setError(null);
    setPin((prev) => prev + digit);
  };

  const handleDelete = () => {
    if (isBusy || isLockedOut) return;
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  };

  const handleDeviceFallback = async () => {
    if (isBusy || isLockedOut || !userId) return;
    setIsBusy(true);
    setError(null);
    const ok = await authenticateBiometric({
      promptMessage: t('auth.biometric.promptMessage'),
      fallbackLabel: t('auth.biometric.deviceFallbackLabel'),
      disableDeviceCredentials: false,
    });
    if (ok) {
      await resetPinLockout(userId);
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

  if (!isUserLoaded || !userId || !isReady) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View
      className="flex-1 items-center justify-center bg-background px-6"
      accessibilityLabel={t('auth.pin.title.verify')}
    >
      <View className="w-full max-w-sm gap-8">
        <View className="items-center gap-2">
          <Text
            className="text-center text-2xl font-bold text-foreground"
            accessibilityRole="header"
            accessibilityLabel={title}
          >
            {title}
          </Text>
          {mode === 'verify' && (
            <Text className="text-center text-muted-foreground">
              {t('auth.pin.verifyHint')}
            </Text>
          )}
        </View>

        <View
          className="flex-row justify-center gap-3"
          accessibilityRole="progressbar"
          accessibilityLabel={t('a11y.pin.progress', { current: pin.length, length: PIN_LENGTH })}
          accessibilityState={{ disabled: isLockedOut }}
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
                accessibilityElementsHidden
              />
            );
          })}
        </View>

        {error && (
          <Text
            className="text-center text-destructive"
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
          >
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
                disabled={isBusy || isLockedOut}
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
              disabled={isBusy || isLockedOut}
            >
              <Text className="text-2xl font-semibold text-foreground">0</Text>
            </KeyButton>
            <KeyButton
              onPress={handleDelete}
              accessibilityLabel={t('common.delete')}
              accessibilityHint={t('a11y.pin.deleteHint')}
              disabled={isBusy || isLockedOut || pin.length === 0}
            >
              <Text className="text-lg font-semibold text-foreground">⌫</Text>
            </KeyButton>
          </View>
        </View>

        <StyledPressable
          onPress={handleSubmit}
          disabled={pin.length !== PIN_LENGTH || isBusy || isLockedOut}
          accessibilityRole="button"
          accessibilityLabel={t('common.continue')}
          accessibilityState={{ disabled: pin.length !== PIN_LENGTH || isBusy || isLockedOut }}
          className={cn(
            'min-h-[48px] items-center justify-center rounded-2xl bg-primary px-5 py-3 active:opacity-90',
            (pin.length !== PIN_LENGTH || isBusy || isLockedOut) && 'opacity-50'
          )}
        >
          <Text className="text-lg font-semibold text-primary-foreground">{t('common.continue')}</Text>
        </StyledPressable>

        {allowDeviceFallback && (
          <StyledPressable
            onPress={handleDeviceFallback}
            disabled={isBusy || isLockedOut}
            accessibilityRole="button"
            accessibilityLabel={t('a11y.pin.deviceFallback')}
            accessibilityState={{ disabled: isBusy || isLockedOut }}
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
