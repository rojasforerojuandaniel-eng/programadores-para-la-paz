import { useRef, useState } from 'react';
import { useSignIn, useSSO } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Linking,
  type TextInput as RNTextInput,
} from 'react-native';
import { Text } from '~/components/ui/text';
import { Apple, AlertCircle, TrendingUp } from 'lucide-react-native';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { TextInput } from '~/components/ui/text-input';
import { Button } from '~/components/ui/button';
import { Pressable } from '~/components/ui/pressable';
import { View } from '~/components/ui/view';
import { Card } from '~/components/ui/card';
import { GoogleIcon } from '~/components/ui/google-icon';
import { hapticImpact } from '~/lib/haptics';

export default function SignInScreen() {
  const { t } = useTranslation();
  const emailSchema = z.string().email(t('errors.invalidEmail'));
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const passwordRef = useRef<RNTextInput>(null);

  const validateEmail = (value: string) => {
    const result = emailSchema.safeParse(value);
    if (!result.success) {
      const issue = result.error.issues[0];
      setEmailError(issue?.message ?? t('errors.invalidEmailFallback'));
      return false;
    }
    setEmailError('');
    return true;
  };

  const onSignIn = async () => {
    if (!isLoaded || !signIn || !email || !password) return;
    if (!validateEmail(email)) return;
    setError('');
    setLoading(true);
    try {
      const result = await signIn.create({
        strategy: 'password',
        identifier: email,
        password,
      });
      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      } else if (result.status === 'needs_second_factor') {
        router.push({
          pathname: '/(auth)/mfa',
          params: { identifier: email },
        });
      } else {
        setError(t('errors.signInIncomplete'));
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[sign-in] unexpected error', err);
      }
      setError(t('errors.signInFailed'));
    } finally {
      setLoading(false);
    }
  };

  const onSocialSignIn = async (strategy: 'oauth_google' | 'oauth_apple') => {
    setError('');
    setSocialLoading(strategy);
    try {
      const { createdSessionId, setActive: ssoSetActive } = await startSSOFlow({
        strategy,
        redirectUrl: 'rhynode://oauth-native-callback',
      });
      if (createdSessionId && ssoSetActive) {
        await ssoSetActive({ session: createdSessionId });
        router.replace('/(tabs)');
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[sign-in] social sign-in error', err);
      }
      setError(t('errors.socialSignInFailed'));
    } finally {
      setSocialLoading(null);
    }
  };

  const submitDisabled = loading || !email || !password;

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
          <View className="items-center mb-10">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-4">
              <TrendingUp className="h-8 w-8 text-primary-foreground" />
            </View>
            <Text className="text-2xl font-bold tracking-tight text-foreground">
              {t('common.appName')}
            </Text>
          </View>

          <Text className="text-3xl font-bold text-center text-foreground mb-2">
            {t('auth.signIn.title')}
          </Text>
          <Text className="text-base text-center text-muted-foreground mb-8">
            {t('auth.signIn.subtitle')}
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

          <Card className="bg-card border border-border p-5 mb-6">
            <TextInput
              label={t('auth.signIn.emailLabel')}
              className="min-h-[52px] bg-background border border-border"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              returnKeyType="next"
              blurOnSubmit={false}
              onSubmitEditing={() => passwordRef.current?.focus()}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (emailError) validateEmail(value);
              }}
              onBlur={() => validateEmail(email)}
            />

            {emailError ? (
              <View className="mt-2 mb-2 px-1">
                <Text className="text-sm text-destructive">{emailError}</Text>
              </View>
            ) : (
              <View className="h-4" />
            )}

            <TextInput
              ref={passwordRef}
              label={t('auth.signIn.passwordLabel')}
              className="min-h-[52px] bg-background border border-border"
              placeholder={t('auth.signIn.passwordPlaceholder')}
              placeholderTextColor="#9ca3af"
              secureTextEntry
              textContentType="password"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => {
                void hapticImpact();
                void onSignIn();
              }}
              value={password}
              onChangeText={setPassword}
            />
          </Card>

          <Button
            testID="sign-in-submit"
            size="lg"
            className="w-full rounded-2xl"
            onPress={() => {
              void hapticImpact();
              void onSignIn();
            }}
            disabled={submitDisabled}
            loading={loading}
            accessibilityLabel={t('a11y.signIn.submit')}
          >
            <Text className="text-base font-semibold text-primary-foreground">
              {loading ? t('auth.signIn.submitLoading') : t('auth.signIn.submit')}
            </Text>
          </Button>

          <View className="flex-row items-center gap-3 my-8">
            <View className="h-px flex-1 bg-border" />
            <Text className="text-sm text-muted-foreground">{t('auth.signIn.divider')}</Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          <View className="gap-3">
            <Pressable
              className="h-14 flex-row items-center justify-center gap-3 rounded-2xl border border-border bg-card active:bg-secondary"
              onPress={() => onSocialSignIn('oauth_google')}
              disabled={!!socialLoading}
              accessibilityLabel={t('a11y.signIn.google')}
              accessibilityHint={t('auth.signIn.google')}
            >
              <GoogleIcon />
              <Text className="text-base font-semibold text-foreground">
                {t('auth.signIn.google')}
              </Text>
            </Pressable>

            {Platform.OS === 'ios' ? (
              <Pressable
                className="h-14 flex-row items-center justify-center gap-3 rounded-2xl border border-border bg-card active:bg-secondary"
                onPress={() => onSocialSignIn('oauth_apple')}
                disabled={!!socialLoading}
                accessibilityLabel={t('a11y.signIn.apple')}
                accessibilityHint={t('auth.signIn.apple')}
              >
                <Apple className="text-foreground" size={20} />
                <Text className="text-base font-semibold text-foreground">
                  {t('auth.signIn.apple')}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View className="flex-row justify-center items-center mt-10">
            <Text className="text-sm text-muted-foreground">{t('auth.signIn.noAccount')}</Text>
            <Pressable
              onPress={() =>
                Linking.openURL('https://rhynode-finance.vercel.app/sign-up')
              }
              accessibilityLabel={t('a11y.signIn.signUp')}
              accessibilityRole="link"
            >
              <Text className="text-sm font-semibold text-primary ml-1">
                {t('auth.signIn.signUp')}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
