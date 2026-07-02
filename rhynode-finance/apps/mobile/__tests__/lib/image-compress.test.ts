jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {
    manipulate: jest.fn(),
  },
  SaveFormat: {
    JPEG: 'jpeg',
  },
}));

import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { compressImage } from '~/lib/image-compress';

const mockedManipulate = ImageManipulator.manipulate as jest.Mock;

describe('compressImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('resizes and compresses an image', async () => {
    const renderResult = {
      resize: jest.fn().mockReturnThis(),
      renderAsync: jest.fn().mockResolvedValue({
        saveAsync: jest.fn().mockResolvedValue({ uri: 'file://compressed.jpg' }),
      }),
    };
    mockedManipulate.mockReturnValue(renderResult);

    const result = await compressImage('file://original.jpg');

    expect(mockedManipulate).toHaveBeenCalledWith('file://original.jpg');
    expect(renderResult.resize).toHaveBeenCalledWith({ width: 1200 });
    expect(result).toBe('file://compressed.jpg');
  });

  it('uses custom max width and quality', async () => {
    const saveAsync = jest.fn().mockResolvedValue({ uri: 'file://compressed-800.jpg' });
    const renderResult = {
      resize: jest.fn().mockReturnThis(),
      renderAsync: jest.fn().mockResolvedValue({ saveAsync }),
    };
    mockedManipulate.mockReturnValue(renderResult);

    await compressImage('file://original.jpg', 800, 0.5);

    expect(renderResult.resize).toHaveBeenCalledWith({ width: 800 });
    expect(saveAsync).toHaveBeenCalledWith({ format: SaveFormat.JPEG, compress: 0.5 });
  });
});
