import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export async function compressImage(
  uri: string,
  maxWidth = 1200,
  quality = 0.7
): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  const image = await context.resize({ width: maxWidth }).renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: quality });
  return result.uri;
}
