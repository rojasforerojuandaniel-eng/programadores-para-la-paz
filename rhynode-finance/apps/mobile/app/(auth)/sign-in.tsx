import { useState } from 'react';
import { useSignIn } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Button } from '~/components/ui/button';
import { Text } from '~/components/ui/text';
import { TextInput } from '~/components/ui/text-input';
import { View } from '~/components/ui/view';

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSignIn = async () => {
    if (!isLoaded || !signIn || !email || !password) return;
    setError('');
    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });
      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        router.replace('/(tabs)');
      } else {
        setError('No se pudo completar el inicio de sesión');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center bg-background px-6">
      <Text className="text-foreground text-3xl font-bold mb-2">Rhynode</Text>
      <Text className="text-muted-foreground text-lg mb-8">Toma el control de tus finanzas</Text>

      <TextInput
        className="bg-card text-foreground rounded-2xl px-4 py-4 mb-4"
        placeholder="Email"
        placeholderTextColor="#6b7280"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        className="bg-card text-foreground rounded-2xl px-4 py-4 mb-6"
        placeholder="Contraseña"
        placeholderTextColor="#6b7280"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error ? (
        <Text className="text-destructive mb-4">{error}</Text>
      ) : null}

      <Button onPress={onSignIn} disabled={loading || !email || !password}>
        <Text className="text-primary-foreground font-semibold">{loading ? 'Entrando...' : 'Entrar'}</Text>
      </Button>
    </View>
  );
}
