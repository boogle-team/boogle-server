import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { BusinessException } from '@/common/exceptions/business.exception';
import { S3StorageService } from '@/common/storage/s3-storage.service';
import { UserErrorCode } from './user-error-code.enum';
import {
  DEFAULT_PROFILE_IMAGE_MAX_SIZE_BYTES,
  PROFILE_IMAGE_TOO_LARGE_MESSAGE,
} from './profile-image.constants';

export interface ProfileImageFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class ProfileImageService {
  private readonly logger = new Logger(ProfileImageService.name);

  constructor(private readonly storage: S3StorageService) {}

  async save(userId: string, file: ProfileImageFile) {
    this.assertValid(file);

    const extension = EXTENSION_BY_MIME_TYPE[file.mimetype];
    const key = `profile-images/users/${userId}/${randomUUID()}.${extension}`;

    try {
      await this.storage.upload({
        key,
        body: file.buffer,
        contentType: file.mimetype,
      });
      return key;
    } catch (error) {
      this.logger.error('S3 프로필 이미지 저장에 실패했습니다.', error);
      throw new BusinessException(
        UserErrorCode.PROFILE_IMAGE_UPLOAD_FAILED,
        '프로필 이미지를 저장하지 못했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getUrl(key: string | null | undefined) {
    if (!key) {
      return null;
    }

    try {
      return await this.storage.getPublicUrl(key);
    } catch (error) {
      this.logger.error('프로필 이미지 URL 발급에 실패했습니다.', error);
      throw new BusinessException(
        UserErrorCode.PROFILE_IMAGE_ACCESS_FAILED,
        '프로필 이미지를 불러오지 못했습니다.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteBestEffort(key: string | null | undefined) {
    if (!key) {
      return;
    }

    try {
      await this.storage.delete(key);
    } catch (error) {
      this.logger.warn('S3 프로필 이미지 삭제에 실패했습니다.', error);
    }
  }

  assertRequired(
    file: ProfileImageFile | undefined,
  ): asserts file is ProfileImageFile {
    if (!file) {
      throw new BusinessException(
        UserErrorCode.PROFILE_IMAGE_REQUIRED,
        '프로필 이미지 파일은 필수입니다.',
      );
    }
  }

  private assertValid(file: ProfileImageFile) {
    if (!EXTENSION_BY_MIME_TYPE[file.mimetype] || !file.buffer?.length) {
      throw new BusinessException(
        UserErrorCode.PROFILE_IMAGE_INVALID_FORMAT,
        '지원하지 않는 프로필 이미지 형식입니다.',
      );
    }

    if (file.size > DEFAULT_PROFILE_IMAGE_MAX_SIZE_BYTES) {
      throw new BusinessException(
        UserErrorCode.PROFILE_IMAGE_TOO_LARGE,
        PROFILE_IMAGE_TOO_LARGE_MESSAGE,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
  }
}
