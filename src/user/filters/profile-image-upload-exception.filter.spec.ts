import {
  ArgumentsHost,
  HttpStatus,
  PayloadTooLargeException,
} from '@nestjs/common';
import { ProfileImageUploadExceptionFilter } from './profile-image-upload-exception.filter';
import { UserErrorCode } from '../user-error-code.enum';
import { PROFILE_IMAGE_TOO_LARGE_MESSAGE } from '../profile-image.constants';

describe('ProfileImageUploadExceptionFilter', () => {
  it('50MB 초과 업로드 오류를 프로필 이미지 도메인 오류로 변환한다', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;

    new ProfileImageUploadExceptionFilter().catch(
      new PayloadTooLargeException('File too large'),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(json).toHaveBeenCalledWith({
      success: false,
      code: UserErrorCode.PROFILE_IMAGE_TOO_LARGE,
      message: PROFILE_IMAGE_TOO_LARGE_MESSAGE,
    });
  });
});
