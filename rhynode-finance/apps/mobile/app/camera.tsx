import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Pressable } from '~/components/ui/pressable';
import { useAuth } from '@clerk/clerk-expo';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { API_URL, safeJson } from '~/lib/api';
import { showToast } from '~/hooks/use-toast';
import { ocrResultSchema, uploadReceiptResponseSchema } from '~/schemas/dashboard';

export default function CameraScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);

  if (!permission) {
    return <View className="flex-1 bg-background" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <Text className="text-foreground text-lg mb-4">Necesitamos acceso a la cámara para escanear recibos.</Text>
        <Pressable testID="request-camera-permission" onPress={requestPermission} className="bg-primary rounded-2xl px-6 py-3">
          <Text className="text-primary-foreground font-semibold">Permitir cámara</Text>
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
      const uploadHeaders: Record<string, string> = { Authorization: `Bearer ${token}` };

      const form = new FormData();
      form.append('file', {
        uri: photo.uri,
        name: 'receipt.jpg',
        type: 'image/jpeg',
      } as unknown as Blob);

      const blobRes = await fetch(`${API_URL}/api/mobile/upload-receipt`, {
        method: 'POST',
        headers: uploadHeaders,
        body: form,
      });

      if (!blobRes.ok) {
        const text = await blobRes.text().catch(() => '');
        throw new Error(`Upload failed (${blobRes.status}): ${text}`);
      }
      const uploadJson = (await blobRes.json()) as unknown;
      const { url } = safeJson(uploadReceiptResponseSchema, uploadJson);

      const ocrRes = await fetch(`${API_URL}/api/ai/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...uploadHeaders },
        body: JSON.stringify({ imageUrl: url }),
      });

      if (!ocrRes.ok) {
        const text = await ocrRes.text().catch(() => '');
        throw new Error(`OCR failed (${ocrRes.status}): ${text}`);
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
      const message = error instanceof Error ? error.message : 'Error procesando el recibo';
      showToast(message, 'error');
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} className="flex-1" facing="back">
        <View className="absolute bottom-12 left-0 right-0 items-center">
          <Pressable
            testID="camera-shutter"
            accessibilityRole="button"
            accessibilityLabel="Tomar foto del recibo"
            onPress={takePicture}
            disabled={loading}
            className="w-20 h-20 rounded-full border-4 border-white bg-white/20 items-center justify-center"
          >
            <Text className="text-white text-3xl">{loading ? '...' : '●'}</Text>
          </Pressable>
        </View>
      </CameraView>
    </View>
  );
}
