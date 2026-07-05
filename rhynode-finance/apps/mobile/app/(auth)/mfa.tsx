import { useState } from 'react';
import { useSignIn } from '@clerk/clerk-expo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { AlertCircle, TrendingUp } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { MfaCodeInput } from '~/components/features/mfa-code-input';
import { Button } from '~/components/ui/button';
import { KeyboardAvoidingView } from '~/components/ui/keyboard-avoiding-view';
import { Pressable } from '~/components/ui/pressable';
import { ScrollView } from '~/components/ui/scroll-view';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { hapticImpact } from '~/lib/haptics';

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
      className="flex-1 bg-background"
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center px-6 py-12">
          <View className="items-center mb-10 flex-row justify-center gap-3">
            <View className="h-14 w-14 rounded-2xl bg-primary items-center justify-center">
              <TrendingUp className="h-7 w-7 text-primary-foreground" />
            </View>
            <Text className="text-2xl font-bold tracking-tight text-foreground">
              {t('common.appName')}
            </Text>
          </View>

          <Text className="text-3xl font-bold text-center text-foreground mb-2">
            {t('auth.mfa.title')}
          </Text>
          <Text className="text-base text-center text-muted-foreground mb-8">
            {identifier
              ? t('auth.mfa.subtitleWithIdentifier', { identifier })
              : t('auth.mfa.subtitle')}
          </Text>

          {error ? (
            <View
              className="flex-row items-center gap-2 rounded-2xl border p-4 mb-6"
              style={{
                backgroundColor: 'rgba(220, 38, 38, 0.12)',
                borderColor: 'rgba(220, 38, 38, 0.3)',
              }}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              <AlertCircle className="text-destructive" size={18} />
              <Text className="flex-1 text-sm text-foreground">{error}</Text>
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
            placeholder={t('auth.mfa.totpPlaceholder')}
          />

          <Button
            testID="mfa-verify-button"
            size="lg"
            className="w-full rounded-2xl"
            onPress={() => {
              void hapticImpact();
              void onVerify();
            }}
            disabled={loading || code.length === 0}
            accessibilityLabel={t('a11y.mfa.verify')}
          >
            <Text className="text-base font-semibold text-primary-foreground">
              {loading ? t('auth.mfa.verifyLoading') : t('auth.mfa.verify')}
            </Text>
          </Button>

          <Pressable
            testID="mfa-toggle-backup"
            accessibilityLabel={
              isBackupCode
                ? t('a11y.mfa.useTotp')
                : t('a11y.mfa.useBackupCode')
            }
            onPress={() => {
              setIsBackupCode((prev) => !prev);
              setCode('');
              setError('');
            }}
            className="items-center mt-6 py-2"
          >
            <Text className="text-sm font-semibold text-primary">
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
