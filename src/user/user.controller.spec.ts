import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '@/auth/auth.service';
import type { AuthenticatedUser } from '@/auth/types/authenticated-user.type';
import { BusinessException } from '@/common/exceptions/business.exception';
import { UserErrorCode } from './user-error-code.enum';
import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
  const user: AuthenticatedUser = { id: '1' };
  const userService = {
    saveOnboarding: jest.fn(),
    updateMe: jest.fn(),
    updateProfileImage: jest.fn(),
    deleteProfileImage: jest.fn(),
    getSensitiveInfoConsent: jest.fn(),
    updateSensitiveInfoConsent: jest.fn(),
    getNotificationSettings: jest.fn(),
    updateNotificationSettings: jest.fn(),
  };
  let controller: UserController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: userService,
        },
        {
          provide: AuthService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  describe('notification settings', () => {
    it('getNotificationSettings는 사용자 id로 서비스에 위임한다', async () => {
      const response = { recordAlarm: 'Y', reportAlarm: 'Y', warnAlarm: 'N' };
      userService.getNotificationSettings.mockResolvedValue(response);

      await expect(controller.getNotificationSettings(user)).resolves.toBe(
        response,
      );
      expect(userService.getNotificationSettings).toHaveBeenCalledWith('1');
    });

    it('updateNotificationSettings는 사용자 id와 부분 변경 dto를 서비스에 전달한다', async () => {
      const dto = { recordAlarm: 'N' as const };
      const response = { recordAlarm: 'N', reportAlarm: 'Y', warnAlarm: 'Y' };
      userService.updateNotificationSettings.mockResolvedValue(response);

      await expect(
        controller.updateNotificationSettings(user, dto),
      ).resolves.toBe(response);
      expect(userService.updateNotificationSettings).toHaveBeenCalledWith(
        '1',
        dto,
      );
    });
  });

  describe('updateSensitiveInfoConsent', () => {
    it('passes the authenticated user id and request to the service', async () => {
      const request = { agreed: false, policyVersion: '2026.07.15' };
      const response = { ...request, agreedAt: null, withdrawnAt: 'now' };
      userService.updateSensitiveInfoConsent.mockResolvedValue(response);

      await expect(
        controller.updateSensitiveInfoConsent(user, request),
      ).resolves.toBe(response);
      expect(userService.updateSensitiveInfoConsent).toHaveBeenCalledWith(
        '1',
        request,
      );
    });
  });

  it('passes an uploaded onboarding profile image to the service', async () => {
    const dto = {
      nickname: '부글이',
      gender: 'M' as const,
      ageGroup: 20 as const,
      baselineType: 'R' as const,
    };
    const file = {
      originalname: 'profile.png',
      mimetype: 'image/png',
      size: 3,
      buffer: Buffer.from('png'),
    };
    userService.saveOnboarding.mockResolvedValue({});

    await controller.saveOnboarding(user, dto, file);

    expect(userService.saveOnboarding).toHaveBeenCalledWith('1', dto, file);
  });

  it('passes an uploaded profile image to updateMe', async () => {
    const dto = { nickname: '새닉네임' };
    const file = {
      originalname: 'profile.webp',
      mimetype: 'image/webp',
      size: 4,
      buffer: Buffer.from('webp'),
    };
    userService.updateMe.mockResolvedValue({});

    await controller.updateMe(user, dto, file);

    expect(userService.updateMe).toHaveBeenCalledWith('1', dto, file);
  });

  it('passes an uploaded image to the dedicated profile image API', async () => {
    const file = {
      originalname: 'profile.png',
      mimetype: 'image/png',
      size: 3,
      buffer: Buffer.from('png'),
    };
    userService.updateProfileImage.mockResolvedValue({});

    await controller.updateProfileImage(user, file);

    expect(userService.updateProfileImage).toHaveBeenCalledWith('1', file);
  });

  it('passes the authenticated user to the profile image delete API', async () => {
    userService.deleteProfileImage.mockResolvedValue({});

    await controller.deleteProfileImage(user);

    expect(userService.deleteProfileImage).toHaveBeenCalledWith('1');
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSensitiveInfoConsent', () => {
    it('passes the authenticated user id to the service', async () => {
      const response = {
        agreed: false,
        policyVersion: '2026.07.15',
        agreedAt: null,
        withdrawnAt: null,
      };
      userService.getSensitiveInfoConsent.mockResolvedValue(response);

      await expect(controller.getSensitiveInfoConsent(user)).resolves.toBe(
        response,
      );
      expect(userService.getSensitiveInfoConsent).toHaveBeenCalledWith('1');
    });

    it('propagates USER_NOT_FOUND from the service', async () => {
      const exception = new BusinessException(
        UserErrorCode.USER_NOT_FOUND,
        '사용자를 찾을 수 없습니다.',
        HttpStatus.NOT_FOUND,
      );
      userService.getSensitiveInfoConsent.mockRejectedValue(exception);

      await expect(controller.getSensitiveInfoConsent(user)).rejects.toBe(
        exception,
      );
    });
  });
});
