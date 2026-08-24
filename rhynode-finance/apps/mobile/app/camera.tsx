import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Pressable } from '~/components/ui/pressable';
import { useAuth } from '@clerk/clerk-expo';
import { Text } from '~/components/ui/text';
import { View } from '~/components/ui/view';
import { API_URL } from '~/lib/api';
import { ChevronLeft, Camera, AlertCircle, CheckCircle } from 'lucide-react-native';

export default function CameraScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!permission) {
    return <View className="flex-1 bg-background" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-6">
        <View className="w-16 h-16 rounded-full bg-primary/20 items-center justify-center mb-4">
          <Camera size={32} color="#10b981" />
        </View>
        <Text className="text-foreground text-lg font-semibold mb-2">Acceso a cámara</Text>
        <Text className="text-muted-foreground text-center text-sm mb-6">
          Necesitamos acceso a la cámara para escanear recibos y generar transacciones automáticamente.
        </Text>
        <Pressable testID="request-camera-permission" onPress={requestPermission} className="bg-primary rounded-2xl px-6 py-3">
          <Text className="text-primary-foreground font-semibold">Permitir cámara</Text>
        </Pressable>
      </View>
    );
  }

  const takePicture = async () => {
    setError(null);
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
      setLoading(false);
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
      setError('Error al procesar el recibo. Intenta de nuevo.');
    }
  };

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} className="flex-1" facing="back">
        {/* Header overlay */}
        <View className="absolute top-12 left-0 right-0 px-6">
          <View className="flex-row items-center justify-between">
            <Pressable onPress={() => router.back()} className="w-10 h-10 rounded-full bg-black/50 items-center justify-center">
              <ChevronLeft size={20} color="#ffffff" />
            </Pressable>
            <Text className="text-white font-semibold">Escanear recibo</Text>
            <View style={{ width: 40 }} />
          </View>
        </View>

        {/* Error message */}
        {error && (
          <View className="absolute top-28 left-6 right-6 bg-destructive/90 rounded-xl px-4 py-3 flex-row items-center gap-2">
            <AlertCircle size={16} color="#ffffff" />
            <Text className="text-white text-sm flex-1">{error}</Text>
          </View>
        )}

        {/* Success indicator */}
        {loading && (
          <View className="absolute top-28 left-6 right-6 bg-primary/90 rounded-xl px-4 py-3 flex-row items-center gap-2">
            <CheckCircle size={16} color="#ffffff" />
            <Text className="text-white text-sm flex-1">Procesando recibo...</Text>
          </View>
        )}

        {/* Shutter button */}
        <View className="absolute bottom-12 left-0 right-0 items-center">
          <Pressable
            testID="camera-shutter"
            onPress={takePicture}
            disabled={loading}
            className="w-20 h-20 rounded-full border-4 border-white bg-white/20 items-center justify-center"
          >
            {loading ? (
              <Text className="text-white text-lg">...</Text>
            ) : (
              <View className="w-16 h-16 rounded-full bg-white" />
            )}
          </Pressable>
          <Text className="text-white/70 text-sm mt-3">Toca para capturar</Text>
        </View>
      </CameraView>
    </View>
  );
}
