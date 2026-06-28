import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Pressable } from '~/components/ui/pressable';
import { useAuth } from '@clerk/clerk-expo';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { API_URL } from '~/lib/api';

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
    const photo = await cameraRef.current?.takePictureAsync({ base64: true, quality: 0.7 });
    if (!photo?.base64) return;

    setLoading(true);
    try {
      const token = await getToken().catch(() => null);
      const uploadHeaders: Record<string, string> = {};
      if (token) uploadHeaders.Authorization = `Bearer ${token}`;

      const blobRes = await fetch(`${API_URL}/api/mobile/upload-receipt`, {
        method: 'POST',
        headers: uploadHeaders,
        body: (() => {
          const form = new FormData();
          form.append('file', {
            uri: photo.uri,
            name: 'receipt.jpg',
            type: 'image/jpeg',
          } as unknown as Blob);
          return form;
        })(),
      });

      if (!blobRes.ok) throw new Error('Upload failed');
      const { url } = (await blobRes.json()) as { url: string };

      const ocrRes = await fetch(`${API_URL}/api/ai/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...uploadHeaders },
        body: JSON.stringify({ imageUrl: url }),
      });

      const ocrData = await ocrRes.json();
      router.push({
        pathname: '/(tabs)/add',
        params: {
          merchant: ocrData.merchant ?? '',
          total: ocrData.total?.toString() ?? '',
          date: ocrData.date ?? '',
        },
      });
    } catch {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} className="flex-1" facing="back">
        <View className="absolute bottom-12 left-0 right-0 items-center">
          <Pressable
            testID="camera-shutter"
            onPress={takePicture}
            disabled={loading}
            className="w-20 h-20 rounded-full border-4 border-white bg-white/20 items-center justify-center"
          >
            <Text className="text-white">{loading ? '...' : '📷'}</Text>
          </Pressable>
        </View>
      </CameraView>
    </View>
  );
}
