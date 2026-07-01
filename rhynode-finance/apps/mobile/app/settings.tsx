import { useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { Pressable } from '~/components/ui/pressable';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignOut = () => {
    Alert.alert(t('settings.signOutTitle'), t('settings.signOutMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOutConfirm'),
        style: 'destructive',
        onPress: confirmSignOut,
      },
    ]);
  };

  const confirmSignOut = async () => {
    setIsSigningOut(true);
    setError(null);

    try {
      await signOut();
      router.replace('/(auth)/sign-in');
    } catch {
      setError(t('settings.signOutError'));
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <View className="flex-1 bg-background px-6 pt-6">
      <Pressable onPress={() => router.back()} className="mb-4">
        <Text className="text-primary">{t('common.actions.back')}</Text>
      </Pressable>
      <Text className="text-foreground text-2xl font-bold mb-6">{t('settings.title')}</Text>

      {error && (
        <Text className="text-destructive text-center mb-4">{error}</Text>
      )}

      <Pressable
        onPress={handleSignOut}
        disabled={isSigningOut}
        className="bg-destructive rounded-2xl p-4 active:opacity-80 disabled:opacity-50"
      >
        {isSigningOut ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text className="text-destructive-foreground text-center font-semibold">
            {t('settings.signOutButton')}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
