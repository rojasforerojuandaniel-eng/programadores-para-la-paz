import { useRef, useState } from 'react';
import { useSignIn, useSSO } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Linking,
  StyleSheet,
  type TextInput as RNTextInput,
} from 'react-native';
import { Apple, AlertCircle, TrendingUp } from 'lucide-react-native';
import { z } from 'zod';
import { TextInput } from '~/components/ui/text-input';
import { GoogleIcon } from '~/components/ui/google-icon';
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

const emailSchema = z.string().email('Ingresa un correo electrónico válido');

export default function SignInScreen() {
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
      setEmailError(issue?.message ?? 'Correo inválido');
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
          params: {
            identifier: email,
          },
        });
      } else {
        setError('No se pudo completar el inicio de sesión');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
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
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar sesión con Google/Apple. Intenta de nuevo.'
      );
    } finally {
      setSocialLoading(null);
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
            <Text style={styles.logoText}>Rhynode</Text>
          </View>

          <Text style={styles.title}>Bienvenido de vuelta</Text>
          <Text style={styles.subtitle}>Inicia sesión para continuar con Rhynode</Text>

          {error ? (
            <View style={styles.errorBox}>
              <AlertCircle color={COLORS.destructive} size={18} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TextInput
            label="Correo electrónico"
            placeholderTextColor={COLORS.muted}
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
            <View style={styles.fieldErrorBox}>
              <Text style={styles.fieldErrorText}>{emailError}</Text>
            </View>
          ) : null}

          <TextInput
            ref={passwordRef}
            label="Contraseña"
            placeholder="Contraseña"
            placeholderTextColor={COLORS.muted}
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

          <Pressable
            accessibilityLabel="Entrar"
            accessibilityRole="button"
            onPress={() => {
              void hapticImpact();
              void onSignIn();
            }}
            disabled={loading || !email || !password}
            style={[
              styles.button,
              (loading || !email || !password) && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Text>
          </Pressable>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>o continúa con</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.socialRow}>
            <Pressable
              accessibilityLabel="Iniciar sesión con Google"
              accessibilityRole="button"
              onPress={() => onSocialSignIn('oauth_google')}
              disabled={!!socialLoading}
              style={styles.socialButton}
            >
              <GoogleIcon />
              <Text style={styles.socialButtonText}>Google</Text>
            </Pressable>
            {Platform.OS === 'ios' ? (
              <Pressable
                accessibilityLabel="Iniciar sesión con Apple"
                accessibilityRole="button"
                onPress={() => onSocialSignIn('oauth_apple')}
                disabled={!!socialLoading}
                style={styles.socialButton}
              >
                <Apple color={COLORS.foreground} size={20} />
                <Text style={styles.socialButtonText}>Apple</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>¿No tienes cuenta? </Text>
            <Pressable
              onPress={() =>
                Linking.openURL('https://rhynode-finance.vercel.app/sign-up')
              }
              accessibilityLabel="Regístrate"
              accessibilityRole="link"
            >
              <Text style={styles.footerLink}>Regístrate</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  fieldErrorBox: {
    marginTop: -12,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  fieldErrorText: {
    fontSize: 13,
    color: COLORS.destructive,
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
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.foreground,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 28,
  },
  dividerLine: {
    height: 1,
    flex: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  socialButtonPressed: {
    backgroundColor: COLORS.border,
  },
  socialButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.foreground,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 15,
    color: COLORS.muted,
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
