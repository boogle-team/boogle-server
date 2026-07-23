import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3StorageService } from './s3-storage.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('S3StorageService', () => {
  let service: S3StorageService;
  let send: jest.Mock<
    Promise<Record<string, never>>,
    [PutObjectCommand | DeleteObjectCommand]
  >;

  beforeEach(() => {
    process.env.AWS_REGION = 'ap-northeast-2';
    process.env.AWS_S3_BUCKET = 'test-private-bucket';
    process.env.AWS_CLOUDFRONT_BASE_URL = 'https://cdn.example.com/';
    jest.mocked(getSignedUrl).mockReset();
    service = new S3StorageService();
    send = jest
      .fn<
        Promise<Record<string, never>>,
        [PutObjectCommand | DeleteObjectCommand]
      >()
      .mockResolvedValue({});
    (service as unknown as { client: { send: typeof send } }).client.send =
      send;
  });

  afterEach(() => {
    delete process.env.AWS_REGION;
    delete process.env.AWS_S3_BUCKET;
    delete process.env.AWS_CLOUDFRONT_BASE_URL;
  });

  it('uploads a private object using the default AWS credential chain', async () => {
    await service.upload({
      key: 'profile-images/users/1/image.png',
      body: Buffer.from('image'),
      contentType: 'image/png',
    });

    expect(send).toHaveBeenCalledWith(expect.any(PutObjectCommand));
    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: 'test-private-bucket',
      Key: 'profile-images/users/1/image.png',
      ContentType: 'image/png',
    });
  });

  it('propagates an S3 upload failure', async () => {
    const error = new Error('S3 upload failed');
    send.mockRejectedValueOnce(error);

    await expect(
      service.upload({
        key: 'profile-images/users/1/image.png',
        body: Buffer.from('image'),
        contentType: 'image/png',
      }),
    ).rejects.toBe(error);
  });

  it('rejects upload when the bucket configuration is missing', async () => {
    delete process.env.AWS_S3_BUCKET;

    await expect(
      service.upload({
        key: 'profile-images/users/1/image.png',
        body: Buffer.from('image'),
        contentType: 'image/png',
      }),
    ).rejects.toThrow('AWS_S3_BUCKET environment variable is required.');
    expect(send).not.toHaveBeenCalled();
  });

  it('deletes an object by key', async () => {
    await service.delete('profile-images/users/1/old.png');

    expect(send).toHaveBeenCalledWith(expect.any(DeleteObjectCommand));
    expect(send.mock.calls[0][0].input).toMatchObject({
      Bucket: 'test-private-bucket',
      Key: 'profile-images/users/1/old.png',
    });
  });

  it('propagates an S3 delete failure used by image cleanup', async () => {
    const error = new Error('S3 delete failed');
    send.mockRejectedValueOnce(error);

    await expect(service.delete('profile-images/users/1/old.png')).rejects.toBe(
      error,
    );
  });

  it('uses CloudFront when a base URL is configured', async () => {
    await expect(
      service.getPublicUrl('profile-images/users/1/image.png'),
    ).resolves.toBe('https://cdn.example.com/profile-images/users/1/image.png');
  });

  it('creates a presigned GET URL when CloudFront is not configured', async () => {
    delete process.env.AWS_CLOUDFRONT_BASE_URL;
    jest
      .mocked(getSignedUrl)
      .mockResolvedValue('https://s3.example.com/signed-image-url');

    await expect(
      service.getPublicUrl('profile-images/users/1/image.png'),
    ).resolves.toBe('https://s3.example.com/signed-image-url');
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      { expiresIn: 3600 },
    );
  });

  it('propagates a presigned URL generation failure', async () => {
    delete process.env.AWS_CLOUDFRONT_BASE_URL;
    const error = new Error('presign failed');
    jest.mocked(getSignedUrl).mockRejectedValueOnce(error);

    await expect(
      service.getPublicUrl('profile-images/users/1/image.png'),
    ).rejects.toBe(error);
  });
});
