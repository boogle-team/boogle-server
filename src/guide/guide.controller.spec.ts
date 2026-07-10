import { Test, TestingModule } from '@nestjs/testing';
import { GuideController } from './guide.controller';
import { GuideService } from './guide.service';

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
    }).compile();

    controller = module.get<GuideController>(GuideController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
