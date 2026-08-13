import { Injectable } from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface S3UploadInput {
  key: string;
  body: Buffer;
  contentType: string;
}

@Injectable()
export class S3StorageService {
  private readonly client: S3Client;

  constructor() {
    this.client = new S3Client({ region: this.getRegion() });
  }

  async upload(input: S3UploadInput) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.getBucket(),
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      }),
    );
  }

  async delete(key: string) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
      }),
    );
  }

  async getPublicUrl(key: string) {
    const cloudFrontBaseUrl = process.env.AWS_CLOUDFRONT_BASE_URL?.trim();
    if (cloudFrontBaseUrl) {
      return `${cloudFrontBaseUrl.replace(/\/$/, '')}/${key}`;
    }

    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.getBucket(),
        Key: key,
      }),
      { expiresIn: this.getSignedUrlExpiresIn() },
    );
  }

  private getRegion() {
    return process.env.AWS_REGION?.trim() || 'ap-northeast-2';
  }

  private getBucket() {
    const bucket = process.env.AWS_S3_BUCKET?.trim();
    if (!bucket) {
      throw new Error('AWS_S3_BUCKET environment variable is required.');
    }
    return bucket;
  }

  private getSignedUrlExpiresIn() {
    const configured = Number(process.env.AWS_S3_SIGNED_URL_EXPIRES_IN);
    return Number.isInteger(configured) && configured > 0 ? configured : 3600;
  }
}
