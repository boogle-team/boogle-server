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
    getSensitiveInfoConsent: jest.fn(),
    updateSensitiveInfoConsent: jest.fn(),
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
