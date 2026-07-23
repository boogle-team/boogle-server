import {
  S3StorageService,
  type S3UploadInput,
} from '@/common/storage/s3-storage.service';
import { ProfileImageService } from './profile-image.service';
import { UserErrorCode } from './user-error-code.enum';

describe('ProfileImageService', () => {
  const storage = {
    upload: jest.fn<Promise<void>, [S3UploadInput]>(),
    delete: jest.fn(),
    getPublicUrl: jest.fn(),
  };
  let service: ProfileImageService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProfileImageService(storage as unknown as S3StorageService);
  });

  it('uploads a valid image under a user-scoped S3 object key', async () => {
    storage.upload.mockResolvedValue(undefined);

    await expect(
      service.save('1', {
        originalname: 'profile.png',
        mimetype: 'image/png',
        size: 3,
        buffer: Buffer.from('png'),
      }),
    ).resolves.toMatch(/^profile-images\/users\/1\/.+\.png$/);
    const uploadInput = storage.upload.mock.calls[0][0];
    expect(uploadInput.key).toMatch(/^profile-images\/users\/1\/.+\.png$/);
    expect(uploadInput.contentType).toBe('image/png');
  });

  it('rejects unsupported image formats', async () => {
    await expect(
      service.save('1', {
        originalname: 'profile.gif',
        mimetype: 'image/gif',
        size: 3,
        buffer: Buffer.from('gif'),
      }),
    ).rejects.toMatchObject({
      errorCode: UserErrorCode.PROFILE_IMAGE_INVALID_FORMAT,
      status: 400,
    });
  });

  it('rejects files larger than the configured limit', async () => {
    process.env.PROFILE_IMAGE_MAX_SIZE_BYTES = '2';

    await expect(
      service.save('1', {
        originalname: 'profile.png',
        mimetype: 'image/png',
        size: 3,
        buffer: Buffer.from('png'),
      }),
    ).rejects.toMatchObject({
      errorCode: UserErrorCode.PROFILE_IMAGE_TOO_LARGE,
      status: 413,
    });

    delete process.env.PROFILE_IMAGE_MAX_SIZE_BYTES;
  });

  it('returns a public URL without exposing the object key contract', async () => {
    storage.getPublicUrl.mockResolvedValue('https://cdn.example.com/image.jpg');

    await expect(service.getUrl('private/image.jpg')).resolves.toBe(
      'https://cdn.example.com/image.jpg',
    );
  });

  it('does not fail the request when old object cleanup fails', async () => {
    storage.delete.mockRejectedValue(new Error('S3 unavailable'));

    await expect(service.deleteBestEffort('old-key')).resolves.toBeUndefined();
  });
});
