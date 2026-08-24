import { useState } from 'react';
import { useSignIn, useSSO } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Mail, Lock, Apple, AlertCircle, TrendingUp } from 'lucide-react-native';
import { Button } from '~/components/ui/button';
import { GoogleIcon } from '~/components/ui/google-icon';
import { KeyboardAvoidingView } from '~/components/ui/keyboard-avoiding-view';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { TextInput } from '~/components/ui/text-input';
import { ScrollView } from '~/components/ui/scroll-view';
import { View } from '~/components/ui/view';
import { hapticImpact } from '~/lib/haptics';
import { Platform } from 'react-native';
import { Linking } from 'react-native';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startSSOFlow } = useSSO();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const onSignIn = async () => {
    if (!isLoaded || !signIn || !email || !password) return;
    setError('');
    setLoading(true);
    try {
      const result = await signIn.create({
        strategy: 'password',
        identifier: email,
        password,
      });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      } else if (result.status === 'needs_second_factor') {
        setError(
          'Tu cuenta requiere verificación adicional (MFA). Configúrala en la web e intenta de nuevo.'
        );
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
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión social');
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 48 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 justify-center">
          {/* Logo */}
          <View className="items-center mb-10 flex-row justify-center gap-3">
            <View className="w-14 h-14 rounded-2xl bg-primary items-center justify-center">
              <TrendingUp color="#fafafa" size={28} />
            </View>
            <Text className="text-foreground text-2xl font-bold tracking-tight">Rhynode</Text>
          </View>

          <Text className="text-foreground text-3xl font-bold text-center mb-2">Bienvenido de vuelta</Text>
          <Text className="text-muted-foreground text-base text-center mb-8">Inicia sesión para continuar con Rhynode</Text>

          {/* Error */}
          {error ? (
            <View className="flex-row items-center gap-2 bg-destructive/10 border border-destructive/30 rounded-xl p-3 mb-5">
              <AlertCircle color="#ef4444" size={18} />
              <Text className="text-foreground text-sm flex-1">{error}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View className="mb-4">
            <View className="flex-row items-center bg-card border border-border rounded-2xl px-4">
              <Mail color="#9ca3af" size={20} />
              <TextInput
                className="flex-1 h-14 text-foreground pl-3"
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                textContentType="emailAddress"
              />
            </View>
          </View>

          {/* Password */}
          <View className="mb-4">
            <View className="flex-row items-center bg-card border border-border rounded-2xl px-4">
              <Lock color="#9ca3af" size={20} />
              <TextInput
                className="flex-1 h-14 text-foreground pl-3"
                placeholder="Contraseña"
                placeholderTextColor="#9ca3af"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                textContentType="password"
              />
            </View>
          </View>

          {/* Sign In Button */}
          <Button
            onPress={() => {
              void hapticImpact();
              void onSignIn();
            }}
            disabled={loading || !email || !password}
            className="w-full mt-2"
          >
            <Text className="text-primary-foreground font-semibold text-lg">
              {loading ? 'Entrando...' : 'Entrar'}
            </Text>
          </Button>

          {/* Divider */}
          <View className="flex-row items-center gap-3 my-7">
            <View className="h-px flex-1 bg-border" />
            <Text className="text-muted-foreground text-sm">o continúa con</Text>
            <View className="h-px flex-1 bg-border" />
          </View>

          {/* Social Buttons */}
          <View className="flex-row gap-3">
            <Pressable
              onPress={() => onSocialSignIn('oauth_google')}
              disabled={!!socialLoading}
              className="flex-1 flex-row items-center justify-center gap-2 h-13 rounded-2xl border border-border bg-card"
            >
              <GoogleIcon />
              <Text className="text-foreground text-sm font-medium">Google</Text>
            </Pressable>
            {Platform.OS === 'ios' ? (
              <Pressable
                onPress={() => onSocialSignIn('oauth_apple')}
                disabled={!!socialLoading}
                className="flex-1 flex-row items-center justify-center gap-2 h-13 rounded-2xl border border-border bg-card"
              >
                <Apple color="#fafafa" size={20} />
                <Text className="text-foreground text-sm font-medium">Apple</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Footer */}
          <View className="flex-row justify-center mt-8">
            <Text className="text-muted-foreground text-base">¿No tienes cuenta? </Text>
            <Pressable
              onPress={() => Linking.openURL('https://rhynode-finance.vercel.app/sign-up')}
            >
              <Text className="text-primary text-base font-semibold">Regístrate</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}


