import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X } from 'lucide-react-native';
import { ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Pressable } from '~/components/ui/pressable';
import { useAuth } from '@clerk/clerk-expo';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { createApiClient, OfflineError, safeJson } from '~/lib/api';
import { showToast } from '~/hooks/use-toast';
import { ocrResultSchema, uploadReceiptResponseSchema } from '~/schemas/dashboard';
import { compressImage } from '~/lib/image-compress';

export default function CameraScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { getToken } = useAuth();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);

  if (!permission) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-foreground text-lg mb-4">
          {t('camera.permissionBody')}
        </Text>
        <Pressable
          testID="request-camera-permission"
          accessibilityRole="button"
          accessibilityLabel={t('a11y.allowCamera')}
          onPress={requestPermission}
          className="bg-primary rounded-2xl px-6 py-3"
        >
          <Text className="text-primary-foreground font-semibold">{t('camera.permissionButton')}</Text>
        </Pressable>
      </View>
    );
  }

  const takePicture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ base64: false, quality: 0.7 });
    if (!photo?.uri) return;

    setLoading(true);
    try {
      const token = await getToken().catch(() => null);
      if (!token) throw new Error('Missing auth token');

      const compressedUri = await compressImage(photo.uri);
      const receiptField = {
        name: 'file' as const,
        file: { uri: compressedUri, name: 'receipt.jpg', type: 'image/jpeg' },
      };

      const api = createApiClient(token);
      const { url } = await api.postFormData(
        '/api/mobile/upload-receipt',
        [receiptField],
        uploadReceiptResponseSchema
      );

      const ocrRes = await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? 'https://rhynode-finance.vercel.app'}/api/ai/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ imageUrl: url }),
      });

      if (!ocrRes.ok) {
        throw new Error('OCR request failed');
      }
      const ocrJson = (await ocrRes.json()) as unknown;
      const ocrData = safeJson(ocrResultSchema, ocrJson);
      router.push({
        pathname: '/(tabs)/add',
        params: {
          merchant: ocrData.merchant ?? '',
          total: ocrData.total?.toString() ?? '',
          date: ocrData.date ?? '',
        },
      });
    } catch (error) {
      if (error instanceof OfflineError) {
        showToast(t('camera.offlineSuccess'), 'success');
        router.back();
      } else {
        showToast(t('camera.processError'), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} className="flex-1" facing="back">
        <View className="absolute top-12 left-4">
          <Pressable
            testID="camera-close"
            accessibilityRole="button"
            accessibilityLabel={t('a11y.closeCamera')}
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-black/40 items-center justify-center"
          >
            <X size={24} color="#ffffff" strokeWidth={2} />
          </Pressable>
        </View>

        <View className="absolute inset-0 items-center justify-center pointer-events-none">
          <View className="w-3/4 aspect-[3/4] border-2 border-white/60 rounded-xl">
            <View className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white">
              {' '}
            </View>
            <View className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white">
              {' '}
            </View>
            <View className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white">
              {' '}
            </View>
            <View className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white">
              {' '}
            </View>
          </View>
          <Text className="text-white/80 mt-4 text-sm font-medium">
            {t('camera.frameHint')}
          </Text>
        </View>

        <View className="absolute bottom-12 left-0 right-0 items-center">
          <Pressable
            testID="camera-shutter"
            accessibilityRole="button"
            accessibilityLabel={t('a11y.takeReceiptPhoto')}
            onPress={takePicture}
            disabled={loading}
            className="w-20 h-20 rounded-full border-4 border-white bg-white/20 items-center justify-center"
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-white text-3xl">●</Text>
            )}
          </Pressable>
        </View>
      </CameraView>
    </View>
  );
}
