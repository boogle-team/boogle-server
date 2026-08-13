import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { GuideController } from './guide.controller';
import { GuideService } from './guide.service';
import { RESPONSE_MESSAGE_KEY } from '@/common/decorators/response-message.decorator';

describe('GuideController', () => {
  let controller: GuideController;

  const guideServiceMock = {
    getGuideScreen: jest.fn(),
    getGuideDetail: jest.fn(),
    createGuideFeedback: jest.fn(),
    updateGuideFeedback: jest.fn(),
    deleteGuideFeedback: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuideController],
      providers: [
        {
          provide: GuideService,
          useValue: guideServiceMock,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GuideController>(GuideController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  function getResponseMessage(prototype: object, methodName: string): unknown {
    const method: unknown = Reflect.get(prototype, methodName);

    if (typeof method !== 'function') {
      throw new Error(`${methodName} is not a method`);
    }

    return Reflect.getMetadata(RESPONSE_MESSAGE_KEY, method) as
      string | undefined;
  }

  it('Guide 성공 메시지 metadata가 API 명세와 일치한다', () => {
    expect(
      getResponseMessage(GuideController.prototype, 'getGuideScreen'),
    ).toBe('가이드 화면 조회에 성공했습니다.');

    expect(
      getResponseMessage(GuideController.prototype, 'getGuideDetail'),
    ).toBe('가이드 상세 조회에 성공했습니다.');

    expect(
      getResponseMessage(GuideController.prototype, 'createGuideFeedback'),
    ).toBe('가이드 피드백이 등록되었습니다.');

    expect(
      getResponseMessage(GuideController.prototype, 'updateGuideFeedback'),
    ).toBe('가이드 피드백이 수정되었습니다.');

    expect(
      getResponseMessage(GuideController.prototype, 'deleteGuideFeedback'),
    ).toBe('가이드 피드백이 삭제되었습니다.');
  });
});
