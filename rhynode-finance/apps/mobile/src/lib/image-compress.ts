import * as ImageManipulator from 'expo-image-manipulator';

export async function compressImage(
  uri: string,
  maxWidth = 1200,
  quality = 0.7
): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: maxWidth } }],
    {
      format: ImageManipulator.SaveFormat.JPEG,
      compress: quality,
    }
  );

  return result.uri;
}
