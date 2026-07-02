import { useState } from 'react';
import { useSignIn } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native';
import { AlertCircle, TrendingUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { MfaCodeInput } from '~/components/features/mfa-code-input';
import { hapticImpact } from '~/lib/haptics';
import { colors } from '~/theme/colors';

const COLORS = {
  background: '#08090e',
  foreground: '#fafafa',
  card: '#0d0e13',
  muted: '#9ca3af',
  primary: colors.primary,
  border: '#26272b',
  destructive: '#ef4444',
};

export default function MfaScreen() {
  const { t } = useTranslation();
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const params = useLocalSearchParams();
  const identifier = normalizeParam(params.identifier);

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isBackupCode, setIsBackupCode] = useState(false);

  const onVerify = async () => {
    if (!isLoaded || !signIn || !code) return;

    setError('');
    setLoading(true);

    try {
      const result = await signIn.attemptSecondFactor({
        strategy: isBackupCode ? 'backup_code' : 'totp',
        code,
      });

      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      } else {
        setError(t('errors.mfa.invalidCode'));
      }
    } catch (err) {
      const status = getClerkErrorStatus(err);
      if (isNetworkError(err)) {
        setError(t('errors.network'));
      } else if (status === 'sign_in_second_factor_not_allowed') {
        setError(t('errors.mfa.notAllowed'));
      } else if (status === 'too_many_requests') {
        setError(t('errors.tooManyRequests'));
      } else if (status === 'code_invalid' || status === 'verification_failed') {
        setError(t('errors.mfa.invalidCode'));
      } else {
        setError(t('errors.mfa.verifyFailed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.inner}>
          <View style={styles.logoWrap}>
            <View style={styles.logoBox}>
              <TrendingUp color={COLORS.foreground} size={28} />
            </View>
            <Text style={styles.logoText}>{t('common.appName')}</Text>
          </View>

          <Text style={styles.title}>{t('auth.mfa.title')}</Text>
          <Text style={styles.subtitle}>
            {identifier
              ? t('auth.mfa.subtitleWithIdentifier', { identifier })
              : t('auth.mfa.subtitle')}
          </Text>

          {error ? (
            <View style={styles.errorBox}>
              <AlertCircle color={COLORS.destructive} size={18} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <MfaCodeInput
            value={code}
            onChangeText={setCode}
            onSubmitEditing={() => {
              void hapticImpact();
              void onVerify();
            }}
            maxLength={isBackupCode ? 16 : 6}
            keyboardType={isBackupCode ? 'default' : 'number-pad'}
            isBackupCode={isBackupCode}
            editable={!loading}
            autoFocus
          />

          <Pressable
            testID="mfa-verify-button"
            accessibilityLabel={t('a11y.mfa.verify')}
            accessibilityRole="button"
            onPress={() => {
              void hapticImpact();
              void onVerify();
            }}
            disabled={loading || code.length === 0}
            style={[
              styles.button,
              (loading || code.length === 0) && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>
              {loading ? t('auth.mfa.verifyLoading') : t('auth.mfa.verify')}
            </Text>
          </Pressable>

          <Pressable
            testID="mfa-toggle-backup"
            accessibilityLabel={
              isBackupCode
                ? t('a11y.mfa.useTotp')
                : t('a11y.mfa.useBackupCode')
            }
            accessibilityRole="button"
            onPress={() => {
              setIsBackupCode((prev) => !prev);
              setCode('');
              setError('');
            }}
            style={styles.toggle}
          >
            <Text style={styles.toggleText}>
              {isBackupCode
                ? t('auth.mfa.useTotp')
                : t('auth.mfa.useBackupCode')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function normalizeParam(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

function getClerkErrorStatus(err: unknown): string | undefined {
  if (typeof err === 'object' && err !== null) {
    if ('status' in err && typeof err.status === 'string') {
      return err.status;
    }
    if ('errors' in err && Array.isArray(err.errors) && err.errors.length > 0) {
      const first = err.errors[0];
      if (
        first &&
        typeof first === 'object' &&
        'code' in first &&
        typeof first.code === 'string'
      ) {
        return first.code;
      }
    }
  }
  return undefined;
}

function isNetworkError(err: unknown): boolean {
  return (
    err instanceof Error &&
    /network|fetch|timeout|abort|offline|no se pudo conectar/i.test(err.message)
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 40,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.foreground,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.foreground,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
    marginBottom: 32,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.foreground,
  },
  button: {
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.foreground,
  },
  toggle: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 8,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
